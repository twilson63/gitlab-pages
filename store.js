
var request = require('request')

module.exports = (db, config) => {
  var gitlab = require('gitlab')(config)
  var apiUrl = config.url + '/api/v3'

  return (id, name) => {
    gitlab.projects.repository.listTree(id, handle(''))

    function handle (path) {
      return function (tree) {
        tree.forEach((node) => {
          if (node.type === 'tree') {
            return gitlab.projects.repository.listTree(id, handle(node.name))
          }
          storeAsset(`${apiUrl}/projects/${id}/repository/raw_blobs/${node.id}`, name)
        })
      }
    }
  }

  // save asset to local database
  function storeAsset (assetUrl, project, asset) {
    request.get(assetUrl, {
      qs: {
        private_token: config.token
      }
    }, (err, r, b) => {
      // handle error
      if (err) return console.dir(err)
      db.put([project, asset].join('/'), b)
    })
  }
}
