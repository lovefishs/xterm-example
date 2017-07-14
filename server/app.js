const { resolve } = require('path')
const express = require('express')
const expressWs = require('express-ws')
const os = require('os')
const pty = require('node-pty')

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash'
const app = express()

expressWs(app)
app.use(express.static(resolve(__dirname, '../dist')))


app.ws('/ws', (ws, req) => {
  const MESSAGE_TYPE_CONFIG = 'config'
  const MESSAGE_TYPE_SIZE = 'size'
  const MESSAGE_TYPE_DATA = 'data'
  const SSH_DEFAULT_INFO = {
    userValue: '',
    userFinish: false,
    pwdValue: '',
    pwdFinish: false,
    host: '',
    port: '',
  }

  let sshInfo = Object.assign({}, SSH_DEFAULT_INFO)
  let term = null

  ws.on('message', (data) => {
    // console.log('message', data)

    const json = JSON.parse(data)
    const message = json.data

    if (json.type === MESSAGE_TYPE_CONFIG) {
      Object.assign(sshInfo, {
        host: message.hostname,
        port: message.port,
      })
    } else if (json.type === MESSAGE_TYPE_SIZE) {
      if (term) {
        term.resize(message.cols, message.rows)
      }
    } else if (json.type === MESSAGE_TYPE_DATA) {
      if (term) {
        term.write(message)
      }
    }

    if (!sshInfo.userFinish) {
      // 输入用户名
      if (json.type === MESSAGE_TYPE_DATA) {
        if (message === '\u0015') {
          // 清空 ctrl + u
          const newMessage = sshInfo.userValue.split('').map(item => '\x08 \x08').join('')
          ws.send(newMessage)
          sshInfo.userValue = ''
        } else if (message.toString().indexOf('\r') > -1) {
          // 换行 \r\n | \r
          if (sshInfo.userValue !== '') {
            ws.send('\r\n')
            sshInfo.userFinish = true
            ws.send('password: ')
          } else {
            ws.send('\r\nlogin: ')
          }
        } else if (`${message}`.charCodeAt() === 127) {
          // 退格
          if (sshInfo.userValue.length > 0) {
            ws.send('\x08 \x08')
            sshInfo.userValue = sshInfo.userValue.slice(0, sshInfo.userValue.length - 1)
          }
        } else {
          sshInfo.userValue += message
          ws.send(message)
        }

        return
      }

      ws.send('login: ')
    } else if (!sshInfo.pwdFinish) {
      // 输入密码
      if (json.type === MESSAGE_TYPE_DATA) {
        if (message === '\u0015') {
          // 清空 ctrl + u
          const newMessage = sshInfo.pwdValue.split('').map(item => '\x08 \x08').join('')
          ws.send(newMessage)
          sshInfo.pwdValue = ''
        } else if (message.toString().indexOf('\r') > -1) {
          // 换行 \r\n | \r
          if (sshInfo.pwdValue !== '') {
            ws.send('\r\n\r\n')
            sshInfo.pwdFinish = true

            console.log('finish: ', JSON.stringify(sshInfo))

            if (!term) {
              term = pty.spawn(shell, [], {
                name: 'xterm-color',
                cols: 80,
                rows: 24,
                cwd: process.env.PWD,
                env: process.env,
              })

              // term.write(`ssh -p ${sshInfo.port} ${sshInfo.userValue}@${sshInfo.host}`)
              // term.write(`${sshInfo.pwdValue}`)

              term.on('data', (data) => {
                try {
                  ws.send(data)
                } catch (ex) {
                  // The WebSocket is not open, ignore
                }
              })

              term.on('close', () => {
                // console.log('term close')

                sshInfo.userValue = ''
                sshInfo.userFinish = false
                sshInfo.pwdValue = ''
                sshInfo.pwdFinish = false

                term = null

                if (ws) {
                  ws.send('\r\n\r\nlogin: ')
                }
              })
            }
          } else {
            ws.send('\r\npassword: ')
          }
        } else if (`${message}`.charCodeAt() === 127) {
          // 退格
          if (sshInfo.pwdValue.length > 0) {
            sshInfo.pwdValue = sshInfo.pwdValue.slice(0, sshInfo.pwdValue.length - 1)
          }
        } else {
          sshInfo.pwdValue += message
        }

        return
      }

      ws.send('password: ')
    }
  })

  ws.on('close', (code) => {
    console.log('close', code)

    if (term) {
      term.kill()
    }
  })
})


app.listen(3000, '0.0.0.0', () => {
  console.log('Example app listening on port 3000!')
})
