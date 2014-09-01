

describe('AnalyzeWords', function(){
  var scope;  //we'll use this scope in our tests

  //mock Application to allow us to inject our own dependencies
  beforeEach(angular.mock.module('cryptoApp'));

  //mock the controller for the same reason and include $rootScope and $controller
  beforeEach(angular.mock.inject(function($rootScope, $controller){

    //create an empty scope
    scope = $rootScope.$new();

    //declare the controller and inject our empty scope
    $controller('CryptoCtrl', {$scope: scope});

  }));

  // tests start here

  it("should analyze words correctly", function() {
    scope.analyze_words("THIS IS A TEST");
    expect(scope.words[0].word).toBe("");
    expect(scope.words[1].word).toBe("A");
    expect(scope.words[2].word).toBe("IS");
    expect(scope.words[3].word).toBe("TEST");
    expect(scope.words[4].word).toBe("THIS");
  });

  it("handle contractions correctly", function() {
    scope.analyze_words("I CAN'T DO IT");
    expect(scope.words[0].word).toBe("");
    expect(scope.words[1].word).toBe("CAN'T");
    expect(scope.words[2].word).toBe("DO");
    expect(scope.words[3].word).toBe("I");
    expect(scope.words[4].word).toBe("IT");
  });

  it("handle punctuation correctly", function() {
    scope.analyze_words("I-CAN'T.DO--IT;REALLY,I:CAN'T");
    expect(scope.words[0].word).toBe("");
    expect(scope.words[1].word).toBe("CAN'T");
    expect(scope.words[2].word).toBe("DO");
    expect(scope.words[3].word).toBe("I");
    expect(scope.words[4].word).toBe("IT");
  });

  it("handle quoted strings correctly", function() {
    scope.analyze_words("\"I CAN DO IT\"");
    expect(scope.words[0].word).toBe("");
    expect(scope.words[1].word).toBe("CAN");
    expect(scope.words[2].word).toBe("DO");
    expect(scope.words[3].word).toBe("I");
    expect(scope.words[4].word).toBe("IT");
  });

  it("handle single-quoted strings correctly", function() {
    scope.analyze_words("'GKFAYFRG AIXKBEKW,'");
    expect(scope.words[1].word).toBe("GKFAYFRG");
    expect(scope.words[2].word).toBe("AIXKBEKW");
  });

});
