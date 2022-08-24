/* eslint-disable @typescript-eslint/consistent-type-imports */
import push from './push'
import { PixelMessage } from '../typings/events'

async function emailToHash(email: string) {
  const msgUint8 = new TextEncoder().encode(email)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

async function loginEvent(e: PixelMessage): Promise<void> {
  const { data } = e
  // eslint-disable-next-line func-names
  const observer = new MutationObserver(function() {
    const sendButton: any = document.querySelector('.vtex-login-2-x-sendButton')

    if (sendButton) {
      // eslint-disable-next-line func-names
      sendButton.addEventListener('click', function() {
        window.localStorage.setItem(
          'extraUserData',
          JSON.stringify({
            loginMethod: 'email',
            loginDate: new Date().toString(),
            loginEventSent: false,
          })
        )
      })

      observer.disconnect()
    }
  })

  const loginPopup = document.getElementsByClassName(
    'vtex-flex-layout-0-x-flexRowContent--headerRow2Icons'
  )[0]

  observer.observe(loginPopup, {
    attributes: false,
    childList: true,
    characterData: false,
    subtree: true,
  })

  if (data.isAuthenticated) {
    observer.disconnect()
  }

  const extraUserData = JSON.parse(
    window.localStorage.getItem('extraUserData') ?? '{}'
  )

  if (extraUserData?.loginMethod && !extraUserData.loginEventSent) {
    push({
      event: 'login',
      loginMethod: extraUserData?.loginMethod,
    })

    window.localStorage.setItem(
      'extraUserData',
      JSON.stringify({
        loginMethod: extraUserData.loginMethod,
        loginDate: extraUserData.loginDate,
        loginEventSent: true,
      })
    )
  }
}

export async function sendExtraEvents(e: PixelMessage) {
  switch (e.data.eventName) {
    case 'vtex:pageView': {
      push({
        event: 'pageView',
        location: e.data.pageUrl,
        page: e.data.pageUrl.replace(e.origin, ''),
        referrer: e.data.referrer,
        ...(e.data.pageTitle && {
          title: e.data.pageTitle,
        }),
      })

      return
    }

    case 'vtex:dataLayerInit': {
      const { payload } = e.data

      push({
        event: 'datalayer-initialized',
        user: payload,
      })

      return
    }

    case 'vtex:signUp': {
      const { payload } = e.data

      push({
        event: 'sign_up',
        user: payload,
      })

      return
    }

    case 'vtex:userData': {
      const { data } = e

      await loginEvent(e)

      if (!data.isAuthenticated) {
        return
      }

      const emailHash = data.email ? await emailToHash(data.email) : undefined

      push({
        event: 'userData',
        userId: data.id,
        emailHash,
      })

      break
    }

    default: {
      break
    }
  }
}
