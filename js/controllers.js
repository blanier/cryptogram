var cryptoApp = angular.module('cryptoApp', ['ngStorage']);

cryptoApp.config(function($locationProvider) {
    $locationProvider.html5Mode(true).hashPrefix('!');
})

cryptoApp.controller('CryptoCtrl', ['$scope',
                                    '$http',
                                    '$window',
                                    '$localStorage',
                                    '$location',
                                    function ($scope, $http, $window, $localStorage, $location) {

  $scope.storageDefaults = {
    cryptext: "",
    key: {},
    samples: [],
    seen: [],
    show_suggestions: true,
    suggestion_limit: 5
  };

  $scope.$storage = $localStorage.$default( $scope.storageDefaults ); 

  $scope.total_chars = 0;
  $scope.freq = {};
  $scope.words = {};
  $scope.start_char_counts = {};
  $scope.end_char_counts = {};
  $scope.dipthong_counts = {};

  $scope.set_key = function( k, v ) {
    // make sure bogus keys never get in
    if (!k.match(/[A-Z]/)) {
      return;
    }

    // set the key
    $scope.$storage.key[k] = v;

    // prevent multiple assignments for same cleartext char
    for (var k1 in $scope.$storage.key) {
      if ($scope.$storage.key[k1] == v && k1!=k ) {
        $scope.$storage.key[k1] = undefined;
      }
    }
  }

  $scope.reset_key = function() {
    $scope.$storage.key = {};
    $scope.update_cryptext();
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
            $scope.reset_key();
          } else {
            $scope.set_key(k, undefined);
          }
          break

        case 9:   // TAB key
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

          if ($scope.$storage.seen.indexOf(s) < 0) {
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

  $scope.load_cryptext_hack = function() {

    $scope.$storage.cryptext = "";
    $scope.update_cryptext();

    if ($scope.$storage.samples.length == 0) {
      $scope.slurp('http://www.corsproxy.com/feeds.feedburner.com/quotationspage/qotd');
      $scope.slurp('http://www.corsproxy.com/feeds.feedburner.com/quotationspage/mqotd');
      $scope.slurp('http://www.corsproxy.com/feeds.feedburner.com/brainyquote/QUOTEBR');
      $scope.slurp('http://www.corsproxy.com/www.thefreedictionary.com/_/WoD/rss.aspx?type=quote');
    }

    $scope.load_handler();
  }

  $scope.load_handler = function() {
    if ($scope.$storage.samples.length > 0 && $scope.$storage.cryptext == "" ) {
      $scope.reset_key();
      $scope.highlights = "";
      var clear = $scope.$storage.clear = $scope.$storage.samples.pop();

      $scope.$storage.cryptext = $scope.scramble(clear);

      // cap the size of $scope.seen, treat it like a fifo
      while($scope.$storage.seen.length > 500) {
        console.log("CROPPING seen: " + $storage.seen.length);
        $scope.$storage.seen.shift();
      }
      $scope.$storage.seen.push(clear);

      $scope.update_cryptext();
    } 
  };

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

  $scope.update_cryptext = function() {
    var newKey = {};
    $scope.freq = {};
    $scope.words = {};

    $scope.$storage.cryptext = $scope.$storage.cryptext.toUpperCase();

    for (i in $scope.$storage.cryptext) {
      var c = $scope.$storage.cryptext[i];
      if ($scope.$storage.key[c]) {
        $scope.update_cryptext_char(newKey, c, $scope.$storage.key[c]);
      } else if (c.match(/[A-Z]/)) {
        $scope.update_cryptext_char(newKey, c, undefined);
      }
    }
    $scope.$storage.key = newKey;

    $scope.analyze_words();
  };

  $scope.update_cryptext_char = function (k, cryptext_char, clear_char) {
    k[cryptext_char] = clear_char;
    $scope.freq[cryptext_char] = ($scope.freq[cryptext_char]?$scope.freq[cryptext_char]:0) + 1;
  };

  $scope.analyze_words = function() {
    var words = $scope.$storage.cryptext.replace(/'/g,"").split(/\W/);
    words.sort();
    $scope.words = words.reduce(function(prev, current, i, array) {

      var lastItem = prev.pop();
      if (current == lastItem.word) {
        lastItem.count++;
        prev.push(lastItem);
      } else {
        var item = { 'word':current, 'length':current.length, 'count':1 };
        prev.push(lastItem);
        prev.push(item);
      }

      return prev;
    }, [{'word':"", 'length':0, 'count':0}]);

    console.log($scope.words);
  };

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

  // force a puzzle to load
  if ($scope.$storage.cryptext == "") {
    $scope.load_cryptext_hack();
  }
  $scope.update_cryptext();

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

  $scope.take_suggestion = function(key, val) {
    console.log("setting " + key + " to " + val);

    for (i in key) {
      $scope.set_key(key[i], val[i]);
    }
  }

  $scope.remove_seen = function(s) {
    console.log("click:" + s);
    $scope.$storage.seen.splice($scope.$storage.seen.indexOf(s),1);
  }

  $scope.set_admin = function(b) {
    $location.search('admin',b);
  }

      
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
