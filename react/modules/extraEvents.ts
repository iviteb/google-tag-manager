/* eslint-disable func-names */
/* eslint-disable no-console */
import push from './push'
import { PixelMessage } from '../typings/events'

async function emailToHash(email: string) {
  const msgUint8 = new TextEncoder().encode(email)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

async function initializedEvent(e: PixelMessage): Promise<void> {
  const { data } = e

  const orderForm = JSON.parse(window.localStorage.getItem('orderform') ?? '{}')

  push({
    event: 'dataLayer-initialized',
    user: {
      visitorLoginState: `${
        data.isAuthenticated
          ? 'authenticated customer'
          : 'unauthenticated customer'
      }`,
      userId: data.id ?? null,
      visitorOptinNewsLetter: `${orderForm?.clientPreferencesData?.optInNewsletter}`,
    },
  })
}

async function loginEvent(e: PixelMessage): Promise<void> {
  const { data } = e
  const observer = new MutationObserver(function() {
    const facebookBtn: any = document.querySelector(
      '.vtex-login-2-x-facebookOptionBtn'
    )

    const googleBtn: any = document.querySelector(
      '.vtex-login-2-x-googleOptionBtn'
    )

    const emailPasswordBtn: any = document.querySelector(
      '.vtex-login-2-x-emailPasswordOptionBtn'
    )

    const accessCodeOptionBtn: any = document.querySelector(
      '.vtex-login-2-x-accessCodeOptionBtn'
    )

    if (accessCodeOptionBtn) {
      accessCodeOptionBtn.addEventListener('click', function() {
        window.localStorage.setItem(
          'extraUserData',
          JSON.stringify({
            loginMethod: 'access_code',
            loginDate: new Date().toString(),
            loginEventSent: false,
          })
        )
      })

      observer.disconnect()
    }

    if (emailPasswordBtn) {
      emailPasswordBtn.addEventListener('click', function() {
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

    if (facebookBtn) {
      facebookBtn.addEventListener('click', function() {
        window.localStorage.setItem(
          'extraUserData',
          JSON.stringify({
            loginMethod: 'facebook',
            loginDate: new Date().toString(),
            loginEventSent: false,
          })
        )
      })

      observer.disconnect()
    }

    if (googleBtn) {
      googleBtn.addEventListener('click', function() {
        window.localStorage.setItem(
          'extraUserData',
          JSON.stringify({
            loginMethod: 'google',
            loginDate: new Date().toString(),
            loginEventSent: false,
          })
        )
      })

      observer.disconnect()
    }
  })

  observer.observe(document, {
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

    case 'vtex:userData': {
      const { data } = e

      await loginEvent(e)

      setTimeout(() => {
        initializedEvent(e)
      }, 1000)

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
