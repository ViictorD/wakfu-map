import Cookies from "js-cookie"

export const generateSwitchCookieIfNotExists = () => {
	const switches_cookie = Cookies.get('switches')
	if (switches_cookie === undefined) {
		const switches = {
			showTeleporters: true,
			showChests: false,
			showTerritories: false,
			showIndoor: false,
		}
		Cookies.set('switches', JSON.stringify(switches))
	}
}

export const getSwitchesCookie = () => {
	const switches_cookie = Cookies.get('switches')
	return JSON.parse(switches_cookie)
}

export const setSwitchCookie = (name, value) => {
	const switches_cookie = getSwitchesCookie()
	switches_cookie[name] = value
	Cookies.set('switches', JSON.stringify(switches_cookie))
}

export const setCookie = (name, value) => {
	Cookies.set(name, value)
}

export const getCookie = (name) => {
	return Cookies.get(name)
}