// const diff = require('jest-diff')

jest.setTimeout(60000)

/* expect.extend({
  toHaveBeenCalledWithMatch(received, expected) {
    if (!received.mock) {
      return {
        pass: false,
        message: () => `expect(jest.fn).toHaveBeenCalledWithMatch(string or regex)`
      }
    } else {
      const args = []
      let pass = false
      for (let i = 0; i < received.mock.calls; i++) {
        let call = received.mock.calls

        if (typeof call === 'string') {
          call = [call]
        }

        for (let j = 0; j < call.length; j++) {
          const arg = call[j]

          if (typeof expected === 'string' && expected === arg) {
            pass = true
            break
          } else if (typeof expected === 'object' && expected.test && expected.test(arg)) {
            pass = true
            break
          } else {
            args.push(arg)
          }
        }

        if (pass) {
          break
        }
      }

      const message = pass ? () =>
        this.utils.matcherHint('.not.toBe') +
            '\n\n' +
            `Expected value not to match:\n` +
            `  ${this.utils.printExpected(expected)}\n` +
            `Received:\n` +
            received.mock.calls.map((args) => {
              return `  ${this.utils.printReceived(args)}`
            }).join('\n')
        : () => {
          const diffString = diff(expected, received, {
            expand: this.expand
          })
          return (
            this.utils.matcherHint('.toBe') +
              '\n\n' +
              `Expected value to match:\n` +
              `  ${this.utils.printExpected(expected)}\n` +
              `Received:\n` +
              received.mock.calls.map((args) => {
                return `  ${this.utils.printReceived(args)}`
              }).join('\n') +
              (diffString ? `\n\nDifference:\n\n${diffString}` : '')
          )
        }

      return { actual: received, message, pass }
    }
  }
})
/**/
