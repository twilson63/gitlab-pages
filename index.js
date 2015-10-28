var request = require('request')
var body = require('body/json')
var send = require('send-data/json')
var sendError = require('send-data/error')
var config = {
  url: 'http://gitlab.chscoderdojo.com',
  token: 'nP8649d8fqqxN5zCb3Aj'
}
var apiUrl = config.url + '/api/v3'
var mime = require('mime')

var couchUrl = 'http://admin:jackdogbyte@104.236.64.64/w3foo'

var PouchDB = require('pouchdb')
PouchDB.plugin(require('pouchdb-upsert'))
var db = PouchDB(couchUrl)

var gitlab = require('gitlab')(config)

var http = require('http')
var HttpHashRouter = require('http-hash-router')

var router = HttpHashRouter()

router.set('/api/system', (req, res) => {
  body(req, res, (err, body) => {
    if (err) { return sendError(req, res, { body: err.message }) }
    if (body.event_name === 'project_create') {
      gitlab.projects.hooks.add(body.project_id, {
        url: 'http://w3z.herokuapp.com/api/project',
        push_events: true
      })
    }
    send(req, res, { ok: true })
  })
})

router.set('/api/project', (req, res) => {
  body(req, res, (err, body) => {
    if (err) { return sendError(req, res, { body: err.message }) }
    // need to build app.js file

    db.putIfNotExists('_design/' + body.repository.name, {
      rewrites: [{
        from: '/',
        to: 'index.html'
      }]
    }).then(function (result) {
      console.log(result)
      var rev = result.rev
      gitlab.projects.repository.listTree(body.project_id, handle(''))
      return true
      function handle (path) {
        return function (tree) {
          console.log(tree)
          tree.forEach(function (node) {
            if (node.type === 'tree') {
              return gitlab.projects.repository.listTree(body.project_id, { path: node.name }, handle(node.name))
            }
            request.get(`${apiUrl}/projects/${body.project_id}/repository/raw_blobs/${node.id}`, {
              qs: {
                private_token: config.token
              }
            }, function (e, r, b) {
              if (e) return console.dir(e)
              console.log(node.name)
              if (path.length > 0) { node.name = path + '/' + node.name }
              db.putAttachment('_design/' + body.repository.name, node.name,
                rev, b, mime.lookup(node.name))
                .then(function (result) {
                  rev = result.rev
                  if (err) return console.dir(err)
                  console.log(body)
                })
                .catch(function (err) { console.log(err.message) })
            })
          })
        }
      }
    }).then(function () {
      console.dir(body)
      send(req, res, { ok: true })
    })
  })
})

var server = http.createServer((req, res) => {
  router(req, res, {}, (err) => sendError(req, res, { body: err.message }))
})

server.listen(process.env.PORT || 3000)

// function updateAttachments (projectId) {
//   function push (node) {
//     request.get(config.url + `/api/v3/projects/${projectId}/repository/raw_blobs/${node.id}?private_token={token}`, {
//       json: true
//     }).pipe(request.put(`${couchUrl}/${node.name}`, {}))
//   }
//
//   function handle (tree) {
//     tree.forEach(function (node) {
//       if (node.type === 'tree') {
//         return gitlab.projects.repository.listTree(projectId, {
//           path: node.name
//         }, handle)
//       }
//       if (node.type === 'blob') push(node)
//     })
//   }
//
//   gitlab.projects.repository.listTree(projectId, { path: '' }, handle)
// }
