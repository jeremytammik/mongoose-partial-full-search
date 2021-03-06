var assert = require('assert')
var mongoose = require('mongoose')
var uri = 'mongodb://localhost/test-mongoose-partial-full-search';
var addPartialFullSearch = require('../')

function getSchema () {
  var s = mongoose.Schema({
      single: String
    , array: [String]
  })
  s.index({ single: 'text', array: 'text' })
  return s;
}

function makeDocs () {
  var ret = [];
  ret.push({
      single: 'Blueberry'
    , array: ['array', 'of', 'strings']
  })
  ret.push({
      single: 'elephant a string'
    , array: ['1']
  })
  ret.push({
      single: 'a significant word ice cream funny'
  })
  return ret;
}

describe('mongoose-partial-full-search', function(){
  it('is a function', function(done){
    assert.equal('function', typeof addPartialFullSearch);
    done();
  })

  it('adds a search method to the schema', function(done){
    var s = getSchema();
    s.plugin(addPartialFullSearch);
    assert.equal('function', typeof s.statics.search);
    done();
  })

  it('has a version', function(done){
    assert.equal('string', typeof addPartialFullSearch.version);
    done();
  })
})

describe('mongoose-partial-full-search integration', function(){
  var db;
  var schema;
  var modelName = 'Test';
  var model, blueberry, elephant, letters;

  before(function(done){
    var m = new mongoose.Mongoose;
    db = m.createConnection(uri);
    db.once('error', done);
    db.once('open', function () {
      schema = getSchema();
      schema.plugin(addPartialFullSearch);
      model = db.model(modelName, schema);
      model.on('index', function (err) {
        assert.ifError(err);
        model.create(makeDocs(), function (err, blue, eleph, zzz) {
          if (err) return done(err);
          blueberry = blue;
          elephant = eleph;
          letters = zzz;
          done();
        });
      })
    })
  })
  after(function(done){
    db.db.dropDatabase(function(){
      db.close(done)
    })
  })

  // it('requires a callback', function(done){
  //   assert.throws(function(){
  //     model.search('stuff');
  //   })
  //   assert.throws(function(){
  //     model.search('stuff', { });
  //   })
  //   done();
  // })
  it('requires a search', function(done){
    model.search({ }, function (err) {
      assert.ok(err);
      done();
    })
  })

  it('casts results to mongoose documents', function(done){
    model.search('blueberry', function (err, res) {
      assert.ifError(err);
      assert.ok(res);
      assert.ok(Array.isArray(res.results));
      res.results.forEach(function (result) {
        assert.ok(result.obj instanceof mongoose.Document);
      })
      assert.equal(1, res.results.length);
      assert.equal(blueberry.id, res.results[0].obj.id);
      done();
    })
  })

  it('accepts limit', function(done){
    model.search('strings', { limit: 1 }, function (err, res) {
      assert.ifError(err);
      assert.ok(res);
      assert.ok(Array.isArray(res.results));
      assert.equal(1, res.results.length);
      assert.equal(blueberry.id, res.results[0].obj.id);
      done();
    })
  })

  it('accepts filter (and casts)', function(done){
    model.search('strings', { filter: { array: [1] } }, function (err, res) {
      assert.ifError(err);
      assert.ok(res);
      assert.ok(Array.isArray(res.results));
      assert.equal(1, res.results.length);
      assert.equal(elephant.id, res.results[0].obj.id);
      done();
    })
  })

  describe('accepts project', function(){
    it('with object syntax', function(done){
      model.search('funny', { project: {single: 0}}, function (err, res) {
        assert.ifError(err);
        assert.ok(res);
        assert.ok(Array.isArray(res.results));
        assert.equal(1, res.results.length);
        assert.equal(letters.id, res.results[0].obj.id);
        assert.equal(undefined, res.results[0].obj.single);
        done();
      })
    })
    it('with string syntax', function(done){
      model.search('funny', { project: '-single'}, function (err, res) {
        assert.ifError(err);
        assert.ok(res);
        assert.ok(Array.isArray(res.results));
        assert.equal(1, res.results.length);
        assert.equal(letters.id, res.results[0].obj.id);
        assert.equal(undefined, res.results[0].obj.single);
        done();
      })
    })
  })

  it('accepts language', function(done){
    model.search('funny', { language: 'spanish'}, function (err, res) {
      assert.ifError(err);
      assert.ok(res);
      assert.ok(Array.isArray(res.results));
      assert.equal(0, res.results.length);
      done();
    })
  })

  it('supports lean', function(done){
    model.search('string', { lean: true }, function (err, res) {
      assert.ifError(err);
      assert.ok(res);
      assert.ok(Array.isArray(res.results));
      assert.equal(2, res.results.length);
      res.results.forEach(function (result) {
        assert.ok(!(result.obj instanceof mongoose.Document));
      })
      done();
    })
  })

})

// if mongoose >= 3.6.1 text index type is supported

