// configuration
var fetchConfig = require('zero-config')
var config = fetchConfig(__dirname, {dcValue: 'heroku'})

// static site database
var levelup = require('levelup')
var db = levelup('./sites')

// gitlab api
var gitlab = require('gitlab')(config.get('gitlab'))

// http server
var http = require('http')

// server router
var HttpHashRouter = require('http-hash-router')
var router = HttpHashRouter()

// api helpers
var body = require('body/json')
var send = require('send-data/json')
var sendError = require('send-data/error')

router.set('/api/system', (req, res) => {
  body(req, res, (err, body) => {
    // handle error
    if (err) { return sendError(req, res, { body: err.message }) }

    // if system hook is new project add project hook
    if (body.event_name === 'project_create') {
      gitlab.projects.hooks.add(body.project_id, {
        url: config.get('server'),
        push_events: true
      })
    }
    send(req, res, { ok: true })
  })
})

var store = require('./store')(db, config.get('gitlab'))
router.set('/api/project', (req, res) => {
  body(req, res, (err, body) => {
    // handle error
    if (err) { return sendError(req, res, { body: err.message }) }
    // get repo files
    if (body.ref === config.get('deploy')) {
      store(body.project_id, body.repository.name)
    }
    send(req, res, { ok: true })
  })
})

// handle mime types
var mime = require('mime')

// static site server
router.set('/:asset', (req, res, opts) => {
  var project = 'awesome'
  // in production get subdomain
  if (process.env.NODE === 'production') {
    project = req.headers.host.split('.')[0]
  }
  // get asset from database (possibly tweak to add from LRU Cache)
  db.get([project, opts.params.asset].join('/'), (err, doc) => {
    // handle error
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'})
      return res.end('Not Found')
    }
    // send asset to client
    res.writeHead(200, {'Content-Type': mime.lookup(opts.params.asset)})
    res.end(doc)
  })
})

// get default asset
router.set('/', (req, res, opts) => {
  var project = 'awesome'
  // in production get subdomain
  if (process.env.NODE === 'production') {
    project = req.headers.host.split('.')[0]
  }

  // get asset from database (possibly tweak to add from LRU Cache)
  db.get([project, 'index.html'].join('/'), (err, doc) => {
    // handle error
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'})
      return res.end('Not Found')
    }
    // send index.html asset to client
    res.writeHead(200, {'Content-Type': 'text/html'})
    res.end(doc)
  })
})

// setup http server
var server = http.createServer((req, res) => {
  router(req, res, {}, (err) => sendError(req, res, { body: err.message }))
})

// listen on port
server.listen(process.env.PORT || 3000)
