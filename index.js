var body = require('body/json')
var send = require('send-data/json')
var sendError = require('send-data/error')
var config = {
  url: 'http://gitlab.chscoderdojo.com',
  token: 'nP8649d8fqqxN5zCb3Aj'
}

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

var deploy = require('./deploy')
router.set('/api/project', (req, res) => {
  body(req, res, (err, body) => {
    if (err) { return sendError(req, res, { body: err.message }) }
    console.log(body)
    deploy(body.project_id, body.repository.name)
    send(req, res, { ok: true })
  })
})

var server = http.createServer((req, res) => {
  router(req, res, {}, (err) => sendError(req, res, { body: err.message }))
})

server.listen(process.env.PORT || 3000)
