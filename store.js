var config = {
  url: 'http://gitlab.chscoderdojo.com',
  token: 'nP8649d8fqqxN5zCb3Aj'
}
var apiUrl = config.url + '/api/v3'
var request = require('request')

var gitlab = require('gitlab')(config)

module.exports = (db) => {
  return (id, name) => {
    gitlab.projects.repository.listTree(id, handle(''))
    function handle (path) {
      return function (tree) {
        tree.forEach((node) => {
          if (node.type === 'tree') {
            return gitlab.projects.repository.listTree(id, handle(node.name))
          }

          request.get(`${apiUrl}/projects/${id}/repository/raw_blobs/${node.id}`, {
            qs: {
              private_token: config.token
            }
          }, function (e, r, b) {
            db.put([name, node.name].join('/'), b)
          })
        })
      }
    }
  }
}
