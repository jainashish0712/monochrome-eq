// js/jiosaavn-api.js
// JioSaavn API integration using sumitkolhe/jiosaavn-api

import { jiosaavnSettings } from './storage.js';
import { Track, Artist } from './container-classes.js';

export class JioSaavnAPI {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 1000 * 60 * 5;
    }

    async fetchWithRetry(endpoint, options = {}) {
        const baseUrl = jiosaavnSettings.getApiBaseUrl().replace(/\/+$/, '');
        const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        const cacheKey = url;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            const response = await fetch(url, { signal: options.signal });
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }
            const data = await response.json();
            if (data && data.success) {
                this.cache.set(cacheKey, { data: data.data, timestamp: Date.now() });
                return data.data;
            }
            throw new Error('API returned unsuccessful response');
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            console.error('JioSaavn API request failed:', error);
            throw error;
        }
    }

    _formatTrack(song) {
        if (!song) return null;
        
        let highestQualityUrl = '';
        if (song.downloadUrl && song.downloadUrl.length > 0) {
            // Pick highest quality
            const qualityOrder = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'];
            for (let q of qualityOrder) {
                const urlObj = song.downloadUrl.find(u => u.quality === q);
                if (urlObj) {
                    highestQualityUrl = urlObj.url;
                    break;
                }
            }
            if (!highestQualityUrl) {
                highestQualityUrl = song.downloadUrl[song.downloadUrl.length - 1].url;
            }
        }
        
        const artistName = (song.artists && song.artists.primary && song.artists.primary.length > 0) 
            ? song.artists.primary[0].name 
            : song.primaryArtists || 'Unknown Artist';
            
        const image = (song.image && song.image.length > 0) 
            ? song.image[song.image.length - 1].url 
            : null;
            
        return new Track({
            id: song.id,
            title: song.name || song.title,
            artist: new Artist({ id: song.primaryArtistsId || song.id, name: artistName }),
            album: {
                id: song.album?.id || song.id,
                title: song.album?.name || song.title,
                cover: image
            },
            duration: song.duration || 0,
            url: highestQualityUrl,
            audioQuality: 'HIGH',
            copyright: song.copyright || ''
        });
    }

    async searchTracks(query, options = {}) {
        const page = options.page || 1; 
        const limit = options.limit || 20;
        const data = await this.fetchWithRetry(`/api/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`, options);
        if (!data || !data.results) return { items: [], total: 0 };
        return {
            items: data.results.map(s => this._formatTrack(s)).filter(Boolean),
            total: data.total || data.results.length
        };
    }

    async searchAlbums(query, options = {}) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const data = await this.fetchWithRetry(`/api/search/albums?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`, options);
        if (!data || !data.results) return { items: [], total: 0 };
        return {
            items: data.results.map(a => ({
                id: a.id,
                title: a.name || a.title,
                artist: new Artist({ name: a.primaryArtists || 'Unknown Artist' }),
                cover: (a.image && a.image.length > 0) ? a.image[a.image.length - 1].url : null,
                year: a.year
            })),
            total: data.total || data.results.length
        };
    }

    async searchArtists(query, options = {}) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const data = await this.fetchWithRetry(`/api/search/artists?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`, options);
        if (!data || !data.results) return { items: [], total: 0 };
        return {
            items: data.results.map(a => new Artist({
                id: a.id,
                name: a.name || a.title,
                picture: (a.image && a.image.length > 0) ? a.image[a.image.length - 1].url : null
            })),
            total: data.total || data.results.length
        };
    }

    async searchPlaylists(query, options = {}) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const data = await this.fetchWithRetry(`/api/search/playlists?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`, options);
        if (!data || !data.results) return { items: [], total: 0 };
        return {
            items: data.results.map(p => ({
                id: p.id,
                title: p.name || p.title,
                cover: (p.image && p.image.length > 0) ? p.image[p.image.length - 1].url : null
            })),
            total: data.total || data.results.length
        };
    }

    async getTrack(id, quality) {
        const data = await this.fetchWithRetry(`/api/songs?ids=${id}`);
        if (!data || data.length === 0) throw new Error('Track not found');
        return this._formatTrack(data[0]);
    }
    
    async getTrackMetadata(id) {
        return this.getTrack(id);
    }

    async getAlbum(id) {
        const data = await this.fetchWithRetry(`/api/albums?id=${id}`);
        if (!data) throw new Error('Album not found');
        
        const image = (data.image && data.image.length > 0) ? data.image[data.image.length - 1].url : null;
        const artistName = (data.artists && data.artists.primary && data.artists.primary.length > 0) 
            ? data.artists.primary[0].name 
            : data.primaryArtists || 'Unknown Artist';
            
        return {
            id: data.id,
            title: data.name || data.title,
            artist: new Artist({ name: artistName }),
            cover: image,
            year: data.year,
            tracks: {
                items: (data.songs || []).map(s => this._formatTrack(s)).filter(Boolean)
            }
        };
    }

    async getArtist(id) {
        const data = await this.fetchWithRetry(`/api/artists?id=${id}`);
        if (!data) throw new Error('Artist not found');
        
        return {
            id: data.id,
            name: data.name || data.title,
            picture: (data.image && data.image.length > 0) ? data.image[data.image.length - 1].url : null,
            topTracks: {
                items: (data.topSongs || []).map(s => this._formatTrack(s)).filter(Boolean)
            },
            albums: {
                items: (data.topAlbums || []).map(a => ({
                    id: a.id,
                    title: a.name || a.title,
                    cover: (a.image && a.image.length > 0) ? a.image[a.image.length - 1].url : null
                }))
            }
        };
    }

    async getPlaylist(id) {
        const data = await this.fetchWithRetry(`/api/playlists?id=${id}`);
        if (!data) throw new Error('Playlist not found');
        
        const image = (data.image && data.image.length > 0) ? data.image[data.image.length - 1].url : null;
            
        return {
            id: data.id,
            title: data.name || data.title,
            cover: image,
            tracks: {
                items: (data.songs || []).map(s => this._formatTrack(s)).filter(Boolean)
            }
        };
    }

    async getStreamUrl(id, quality) {
        const track = await this.getTrack(id, quality);
        if (track && track.url) {
            return {
                url: track.url,
                provider: 'jiosaavn'
            };
        }
        throw new Error('Could not resolve stream URL from JioSaavn');
    }
}
