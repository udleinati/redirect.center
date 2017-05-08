import index from '../index'

describe('./index.js', () => {
  let server

  it('start service', (done) => {
    server = index.listen()
    done()
  })

  it('stop service', (done) => {
    server.close()
    done()
  })
})
