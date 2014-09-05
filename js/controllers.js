var cryptoApp = angular.module('cryptoApp', ['ngStorage']);

cryptoApp.config(function($locationProvider) {
    $locationProvider.html5Mode(true).hashPrefix('!');
})

cryptoApp.factory('suggestions', ['$http', '$rootScope', function($http, $rootScope) {
  var words_by_length = {};

  $http.get("data/wordsEn.txt").
    success(function(data, status, headers, config) {
      var words = data.toUpperCase().split("\n");

      words.map(function(val) {
        var l = val.length;
        var bucket = words_by_length[l] || (words_by_length[l] = [])
        bucket.push(val);
      });
      $rootScope.$broadcast("data:loaded");
    }).
    error(function(data, status, headers, config) {
      console.log("Can't load English words from: " + url);
      console.log(status);
      console.log(data);
    });

  return function(cryptext, key) {
    var captured = {}; // remember what letters are in the backreferences
    var captured_count = 1; // because backreferences are 1-based
    var l = cryptext.length;

    // Makre RE from cryptext
    var re_string = cryptext.split("").reduce(function(prev, cur) {

      // If we know the letter (from the key), just look for it explicitly (and don't capture it)
      if (key[cur]) {
        return prev + key[cur] ;
      }

      if (!cur.match(/[A-Z]/)) {
        return prev+cur;
      }

      // If we have seen this letter before (in this word), refer to the backreference 
      // (and don't capture this instance)
      if (captured[cur] ){
        return prev+"\\"+captured[cur];
      }

      // otherwise, this is a letter we haven't seen yet, remember the backreference
      // number and look for any character
      captured[cur] = captured_count;
      captured_count++;
      return prev + "(\\w)";
    }, "");

    var re = new RegExp("^" + re_string + "$");

    // Scan words for matches
    var v = [];
    angular.forEach(key, function(val) { val && v.push(val) });

    //var matches = words.reduce( function(prev, cur) {
    var matches = (words_by_length[l] || []).reduce( function(prev, cur) {
      var m = cur.match(re);

      if (m && m.shift() &&
          m.every(function(val, i, array) { return array.lastIndexOf(val) == i; }) &&
          m.every(function(val) { return v.indexOf(val) == -1 })
         ) {
        prev.push(cur);
      }
      return prev;
    }, []);

    return matches;
  }
}]);

cryptoApp.directive('cryptChooser', function() {
  function link(scope, element, attrs) {
    if (scope.src[0] >= "A" && scope.src[0] <= "Z") {
      element[0].tabIndex = 0;
    }

    element.on('focus', function(event) {
      console.log("FOCUS");
      scope.show_dialog=true;
    });

    element.on('blur', function(event) {
      console.log("BLUR");
      scope.show_dialog=false;
    });

  };

  return {
    restrict: 'E',
    replace: true,
    transclude: true,
    scope: {
      src: '=',
      key: '=',
      header: '=',
      seperator: '=',
      footer: '=',
    },
    templateUrl: 'cryptChooserTemplate.html',
    link: link
  };
});


cryptoApp.controller('CryptoCtrl', ['$scope',
                                    '$http',
                                    '$window',
                                    '$localStorage',
                                    '$location',
                                    '$interval',
                                    'suggestions',
                                    function ($scope, $http, $window, $localStorage,
                                              $location, $interval, suggestions) {

  $scope.storageDefaults = {
    cryptext: "",
    key: {},
    samples: [],
    seen: [],
    show_suggestions: true,
    suggestion_limit: 5,
    auto_eliminate: false,
    moves: [],
    move_insert_index: 0
  };

  $scope.$storage = $localStorage.$default( $scope.storageDefaults ); 

  $scope.total_chars = 0;
  $scope.freq = {};
  $scope.words = {};
  $scope.word_lengths = [];
  $scope.selection = "all words";
  $scope.filtered = []; // placeholder for filtered suggestion list counts

  $scope.set_key = function( k, v ) {
    // make sure bogus keys never get in
    if (!k.match(/[A-Z]/)) {
      return;
    }

    // do nothing for redundant requests
    if ($scope.$storage.key[k] == v) {
      return;
    }

    // set the key
    $scope.$storage.key[k] = v;

    // and remember for the undo buffer
    $scope.$storage.moves.splice($scope.$storage.move_insert_index,
                                 $scope.$storage.moves.length - $scope.$storage.move_insert_index,
                                 {cryptext:k, clear:v});
    $scope.$storage.move_insert_index++;

    // prevent multiple assignments for same cleartext char
    for (var k1 in $scope.$storage.key) {
      if ($scope.$storage.key[k1] == v && k1!=k ) {
        $scope.$storage.key[k1] = undefined;
      }
    }
  }

  $scope.set_key_from_event = function( k, e ) {
    var c = String.fromCharCode(e.keyCode).toUpperCase();
    if (c.match(/[A-Z]/)) {
      e.preventDefault();
      if (k.match(/[A-Z]/)) {
        $scope.set_key(k, String.fromCharCode(e.keyCode).toUpperCase());
      }
    } else {
      switch (e.keyCode) {
        case 8:   // delete key
        case 32:  // space bar
          e.preventDefault();

          if (e.shiftKey) {
            $scope.revert_to(0);
          } else {
            $scope.set_key(k, undefined);
          }
          break

        case 9:   // TAB key
          break;

        case 38:  // UP arrow
          e.preventDefault();
          $scope.revert_to($scope.$storage.move_insert_index-1);
          break;

        case 40:  // DOWN arrow
          e.preventDefault();
          $scope.revert_to($scope.$storage.move_insert_index+1);
          break;


        default:
          e.preventDefault();
          console.log("HANDLE ME?: " + c + "," + e.keyCode);
          break;
      }
    }
  }

  $scope.give_hint = function(s) {
    for (i in s) {
      $scope.set_key(s[i], $scope.$storage.clear[$scope.$storage.cryptext.indexOf(s[i])]);
    }
  }

  $scope.get_clearchar = function (c) {
    if (c.match(/[A-Z]/)) {
      if ($scope.$storage.key[c]) {
        return $scope.$storage.key[c];
      }
      return "_";
    }
    return c;
  };

  $scope.get_cleartext = function () {
    rv = "";

    for (i in $scope.$storage.cryptext) {
      rv += $scope.get_clearchar($scope.$storage.cryptext[i]);
    }
    return rv;
  };

  $scope.loading = function() {
    return $scope.$storage.cryptext == "";
  }

  $scope.pending_slurps = [];

  $scope.slurp = function(url) {

    $scope.pending_slurps.push(url);

    $http.get(url).
      success(function(data, status, headers, config) {
        var parser = new $window.DOMParser();
        var xml = parser.parseFromString(data,"text/xml");
        var path = "//item/description";
        var nodes=xml.evaluate(path, xml, null, XPathResult.ANY_TYPE, null);
        var result=nodes.iterateNext();

        while (result) {
          var html = /<(?:.|\n)*?>/gm;
          var discuss = /DISCUSS$/;

          var s = result.childNodes[0].textContent.replace(html, '').toUpperCase().replace(discuss,"").trim();

          if ($scope.$storage.seen.indexOf(s) < 0 && $scope.$storage.samples.indexOf(s) < 0 ) {
            $scope.$storage.samples.push(s);
          } else {
            // console.log("Discarding: " + s);
          }
          result=nodes.iterateNext();
        }

        $scope.pending_slurps.splice($scope.pending_slurps.indexOf(url), 1);

        $scope.load_handler();
      }).
      error(function(data, status, headers, config) {
        console.log("ERROR loading " + url);
        console.log(status);
        console.log(data);

        $scope.pending_slurps.splice($scope.pending_slurps.indexOf(url), 1);
      });
  }

  $scope.push_slurps = function() {
    $scope.slurp('http://www.corsproxy.com/feeds.feedburner.com/quotationspage/qotd');
    $scope.slurp('http://www.corsproxy.com/feeds.feedburner.com/quotationspage/mqotd');
    $scope.slurp('http://www.corsproxy.com/feeds.feedburner.com/brainyquote/QUOTEBR');
    $scope.slurp('http://www.corsproxy.com/www.thefreedictionary.com/_/WoD/rss.aspx?type=quote');
  }

  $scope.load_cryptext = function() {
    $scope.$storage.cryptext = "";
    $scope.push_slurps();
    $scope.load_handler();
  }

  $scope.load_handler = function() {
    if ($scope.$storage.samples.length > 0 && $scope.$storage.cryptext == "" ) {
      var clear = $scope.$storage.samples.pop();
      $scope.force_cryptext_from_clear(clear);

      // cap the size of $scope.seen, treat it like a fifo
      while($scope.$storage.seen.length > 500) {
        console.log("CROPPING seen: " + $storage.seen.length);
        $scope.$storage.seen.shift();
      }
      $scope.$storage.seen.push(clear);
    } 
  };

  $scope.force_cryptext_from_clear = function(clear) {
    $scope.$storage.key = {};
    $scope.$storage.moves = [];
    $scope.highlights = "";
    $scope.word_lengths = [];
    $scope.$storage.clear = clear;
    $scope.$storage.cryptext = $scope.scramble(clear);
  }

  $scope.undo_invalid = function(i) {
    return i>=$scope.$storage.move_insert_index;
  }

  $scope.revert_to = function(i) {
   
    // ignore bogus indices
    if (i<0 || i>$scope.$storage.moves.length) {
      return;
    }

    console.log("reverting to change " + i);

    var old_moves = $scope.$storage.moves.slice();

    angular.forEach($scope.$storage.key, function(v, k) { this[k] = undefined }, $scope.$storage.key);

    angular.forEach(old_moves, function(v, k) { 
      if (k<i) { 
        $scope.set_key(v.cryptext, v.clear); 
      } 
    });

    $scope.$storage.moves = old_moves;
    $scope.$storage.move_insert_index = i;
  }

  $scope.scramble = function(src) {
    var src_alpha = [];
    var dst_key = {};

    // prime 1) an array with the letters 'A' to 'Z' and 2) a map with keys 'A' to 'Z'
    for (var i=65; i<91; i++) {
      var s = String.fromCharCode(i);
      src_alpha.push(s);
      dst_key[s] = undefined;
    }

    // generate a random key
    for (var k in dst_key) {
      var i = Math.floor(Math.random() * src_alpha.length);
      var val = src_alpha[i];
      if (k == val) {
        return $scope.scramble(src);
      }
      dst_key[k] = val;
      src_alpha.splice(i, 1);
    }

    console.log(dst_key);

    var rv = "";
    
    for (var i in src) {
      var clear = src[i];

      if (clear.match(/[A-Z]/)) {
        rv += dst_key[clear];
      } else {
        rv+=clear;
      }
    }

    console.log(src);
    console.log(rv);

    return rv;
  };


  $scope.$watch ("$storage.cryptext", function() {
    $scope.freq = {};
    $scope.words = {};

    $scope.$storage.cryptext = $scope.$storage.cryptext.toUpperCase();

    angular.forEach($scope.$storage.cryptext, function(c) {
      if (c.match(/[A-Z]/)) {
        if (!($scope.$storage.key.hasOwnProperty(c))) {
          $scope.$storage.key[c] = undefined;
        }
        $scope.freq[c] = ($scope.freq[c]?$scope.freq[c]:0) + 1;
      }
    });

    $scope.analyze_words($scope.$storage.cryptext);
  });

  $scope.analyze_words = function(text) {
    var words = text.split(/[\s\.\,\;\-:\[\]"]/);
    words.sort();
    $scope.words = words.reduce(function(prev, current, i, array) {

      // handle leading and trailing single-quotes
      current = current.replace(/^'/,"");
      current = current.replace(/'$/,"");

      if ($scope.word_lengths.indexOf(current.length) == -1 && current.length!= 0) {
        $scope.word_lengths.push(current.length);
      }

      if (current.match(/[\d]+/)) {
        return prev;
      }


      var lastItem = prev.pop() || {'word':"", 'length':0, 'count':0} ;
      if (current == lastItem.word) {
        lastItem.count++;
        prev.push(lastItem);
      } else {
        var item = { 'word':current, 'length':current.length, 'count':1 };
        prev.push(lastItem);
        prev.push(item);
      }

      return prev;
    }, []);


    $scope.word_lengths.sort(function(a, b) { return a - b; });
    $scope.generate_suggestions();
  };

  $scope.generate_suggestions = function() {
    angular.forEach($scope.words, function(word) {
      var s = suggestions(word.word, $scope.$storage.key);
      word.number_of_suggestions = s.length;
      $scope.big_suggestions[word.word] = s;
    });
  };

  $scope.$on("data:loaded", function() { $scope.generate_suggestions()});
  $scope.$watchCollection ("$storage.key", function() {
    $scope.generate_suggestions();

    if ($scope.$storage.auto_eliminate) {
      $scope.take_simple_suggestions();
    }
  });

  $scope.is_set = function(c) {
    return $scope.$storage.key[c] != undefined;
  }

  $scope.word_is_solved = function(w) { 
    return w.word.split("").every(function(c) { return c.match(/[A-Z]/) ? $scope.is_set(c) : true });
  }

  $scope.word_is_not_solved = function(w) {
    return !$scope.word_is_solved(w);
  }

  $scope.highlights = "";

  $scope.is_highlighted = function(c) {
    return $scope.highlights.indexOf(c) >= 0;
  };

  $scope.set_highlight = function(c) {
    if (c.match(/[A-Z]/)) {
      $scope.highlights = c;
    } else {
      $scope.highlights="";
    }
  };

  $scope.editable = function(c) {
    return c.match(/[A-Z]/)?"true":"false";
  };

  $scope.puzzle_completed = function() {
    return $scope.$storage.clear == $scope.get_cleartext();
  }

  // force a puzzle to load, and poll for updates
  $scope.push_slurps();
  $scope.intervalPromise = $interval($scope.push_slurps, 4*60*60*1000);
  $scope.$on('$destroy', function () { $interval.cancel(intervalPromise); });

  $scope.$on('$locationChangeSuccess', function(event) {
      $scope.admin = $location.search().admin;
  });

  $scope.change_suggestion_limit = function(i) {
    var x = $scope.$storage.suggestion_limit;

    x += i;

    if (x<5) { x=5; }
    if (x>50) { x=50; }

    $scope.$storage.suggestion_limit = x;
  }

  $scope.take_simple_suggestions = function() {

    while($scope.words.reduce(function (count, w) {
      if (w.number_of_suggestions==1 && $scope.word_is_not_solved(w)) {
        $scope.take_suggestion(w.word, $scope.big_suggestions[w.word][0]);
        return count+1;
      }
      return count;
    }, 0)) {
      $scope.generate_suggestions();
    }
  };

  $scope.take_suggestion = function(key, val) {
    console.log("setting " + key + " to " + val);

    for (i in key) {
      $scope.set_key(key[i], val[i]);
    }
  }

  $scope.remove_seen = function(s) {
    $scope.$storage.seen.splice($scope.$storage.seen.indexOf(s),1);
  }

  $scope.set_admin = function(b) {
    $location.search('admin',b);
  }

  $scope.key_not_set = function(item) {
    var found = false;
    angular.forEach($scope.$storage.key, function(val) { if (val==item) found=true } );
    return !found;
  }

  $scope.big_suggestions = {};
  
  $scope.suggestions =  { 
    by_length: [
      [ // there are no 0-letter suggestions, so I'm overloading this slot
        // to hold letters in order of frequency
        "E", "T", "A", "O", "I", "N", "S", "R", "H", "D", "L", "U",
        "C", "M", "F", "Y", "W", "G", "P", "B", "V", "K", "X", "Q",
        "J", "Z"
      ], 

      [ "A", "I" ],  // 1-letter words

      [ // 2-letter words
        "OF", "TO", "IN", "IT", "IS", "BE", "AS", "AT", "SO", "WE",
        "HE", "BY", "OR", "ON", "DO", "IF", "ME", "MY", "UP", "AN",
        "GO", "NO", "US", "AM"
      ],

      [ // 3-letter words
        "THE", "AND", "FOR", "ARE", "BUT", "NOT", "YOU", "ALL", "ANY",
        "CAN", "HAD", "HER", "WAS", "ONE", "OUR", "OUT", "DAY", "GET",
        "HAS", "HIM", "HIS", "HOW", "MAN", "NEW", "NOW", "OLD", "SEE",
        "TWO", "WAY", "WHO", "BOY", "DID", "ITS", "LET", "PUT", "SAY",
        "SHE", "TOO", "USE"
      ],

      [ // 4-letter words
        "THAT", "WITH", "HAVE", "THIS", "WILL", "YOUR", "FROM", "THEY",
        "KNOW", "WANT", "BEEN", "GOOD", "MUCH", "SOME", "TIME", "VERY",
        "WHEN", "COME", "HERE", "JUST", "LIKE", "LONG", "MAKE", "MANY",
        "MORE", "ONLY", "OVER", "SUCH", "TAKE", "THAN", "THEM", "WELL",
        "WERE"
      ]
    ],

    by_letter_position: [
      [ // last letter - special case the 0-slot for this.
        "E", "S", "T", "D", "N", "R", "Y", "F", "L", "O", "G", "H",
        "A", "K", "M", "P", "U", "W"
      ],

      [ // first letter
        "T", "O", "A", "W", "B", "C", "D", "S", "F", "M", "R", "H",
        "I", "Y", "E", "G", "L", "N", "O", "U", "J", "K"
      ],

      [ // second letter
        "H", "O", "E", "I", "A", "U", "N", "R", "T"
      ],

      [ // third letter
        "E", "S", "A", "R", "N", "I"
      ]
    ],


    doubled: [ "S", "E", "T", "F", "L", "M", "O" ],

    contractions: [
    ]

  };
}]);
