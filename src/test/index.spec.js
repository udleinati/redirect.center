const index = require('../index')

describe('./index.js', () => {
  let server

  it('start service', () => {
    server = index.listen()
  })

  it('stop service', () => {
    server.close()
  })
})
