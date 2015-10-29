var config = {
  url: 'http://gitlab.chscoderdojo.com',
  token: 'nP8649d8fqqxN5zCb3Aj'
}
var couchUrl = 'http://admin:jackdogbyte@104.236.64.64/w3foo'
var db = require('nano')(couchUrl)
var apiUrl = config.url + '/api/v3'
var mime = require('mime')
var request = require('request')
var _ = require('underscore')

module.exports = (project_id, name) => {
  var gitlab = require('gitlab')(config)
  var rev = null

  db.insert({
    rewrites: [{
      from: '/',
      to: 'index.html'
    }]
  }, '_design/' + name, function (e, b) {
    if (e) {
      db.get('_design/' + name, function (e, b) {
        rev = b._rev
        console.log(rev)
        gitlab.projects.repository.listTree(project_id, handle(''))
      })
      return
    }
    rev = b.rev
    console.log(rev)
    gitlab.projects.repository.listTree(project_id, handle(''))
  })

  function handle (path) {
    return function (tree) {
      _(tree).each(function (node) {
        if (node.type === 'tree') {
          return gitlab.projects.repository.listTree(project_id, { path: node.name }, handle(node.name))
        }
        request.get(`${apiUrl}/projects/${project_id}/repository/raw_blobs/${node.id}`, {
          qs: {
            private_token: config.token
          }
        }, function (e, r, b) {
          if (e) return console.dir(e)
          if (path.length > 0) { node.name = path + '/' + node.name }
          db.get('_design/' + name, function (err, doc) {
            if (err) return console.dir(err)
            console.log(doc)
            db.attachment.insert('_design/' + name, node.name, b, mime.lookup(node.name), {
              rev: doc._rev
            }, function (err, body) {
              if (err) return console.dir(err)
              console.log('updated ' + node.name)
              rev = body.rev
              console.log(body)
            })
          })
        })
      })
    }
  }
}
