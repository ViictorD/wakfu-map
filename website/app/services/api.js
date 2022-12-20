import axios from 'axios'

export class ApiService {
	constructor(url = 'http://localhost:5001') {
		this.url = url
		this.abortController = new AbortController()
		this.fetching = false;
	}

	async httpGet(endpoint = '') {
		if (this.fetching) {
			this.abortController.abort()
		}
		this.fetching = true
		let response = null;
		try {
			response = await axios.get(`${this.url}${endpoint}`, { signal: this.abortController.signal })
		}
		catch (err) {}
		this.fetching = false
		return response == null ? null : response.data;
	}

	getTeleporters(map_id) {
		return this.httpGet(`/map/teleporters/${map_id}`)
	}

	getPaperData(lang, map_id) {
		return this.httpGet(`/paper/data/${lang}/${map_id}`)
	}

	getMapData(lang, map_id) {
		return this.httpGet(`/map/data/${lang}/${map_id}`)
	}

	getChests(map_id) {
		return this.httpGet(`/map/chests/${map_id}`)
	}

	getTerritories(lang, map_id) {
		return this.httpGet(`/map/territories/${lang}/${map_id}`)
	}

	getSearch(lang, query) {
		return this.httpGet(`/search/${lang}/${query}`)
	}

	getSearchMore(lang, type, offset, query) {
		return this.httpGet(`/search/more/${lang}/${type}/${offset}/${query}`)
	}

}