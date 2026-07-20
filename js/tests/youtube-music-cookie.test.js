import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

// Mock window, document, and localStorage for Node.js test runner environment
if (typeof window === 'undefined') {
    global.window = {
        location: {
            protocol: 'http:',
            hostname: 'localhost',
            port: '5173'
        }
    };
}

if (typeof document === 'undefined') {
    global.document = {
        cookie: ''
    };
}

if (typeof localStorage === 'undefined') {
    class LocalStorageMock {
        constructor() {
            this.store = {};
        }
        clear() {
            this.store = {};
        }
        getItem(key) {
            return this.store[key] || null;
        }
        setItem(key, value) {
            this.store[key] = String(value);
        }
        removeItem(key) {
            delete this.store[key];
        }
    }
    global.localStorage = new LocalStorageMock();
}

vi.mock('../utils.js', () => ({
    RATE_LIMIT_ERROR_MESSAGE: 'rate limited',
    deriveTrackQuality: vi.fn(),
    delay: vi.fn(() => Promise.resolve()),
    isTrackUnavailable: vi.fn(() => false),
    getExtensionFromBlob: vi.fn(),
    getTrackDiscNumber: vi.fn(),
    normalizeQualityToken: vi.fn((quality) => quality),
    getTrackCoverId: vi.fn(),
    getCoverBlob: vi.fn(),
}));

vi.mock('../storage.js', () => ({
    preferDolbyAtmosSettings: { isEnabled: vi.fn(() => false) },
    trackDateSettings: { useAlbumYear: vi.fn(() => false) },
    devModeSettings: { isEnabled: vi.fn(() => false), getUrl: vi.fn(() => '') },
    amazonMusicSettings: { isEnabled: vi.fn(() => false) },
}));

vi.mock('../cache.js', () => ({
    APICache: class {
        async get() {
            return null;
        }
        async set() {}
        async clearExpired() {}
    },
}));

vi.mock('../dash-downloader.ts', () => ({ DashDownloader: class {} }));
vi.mock('../hls-downloader.js', () => ({ HlsDownloader: class {} }));
vi.mock('../proxy-utils.js', () => ({ getProxyUrl: vi.fn((url) => url), wrapTidalUrl: vi.fn((url) => url) }));
vi.mock('../ffmpeg.js', () => ({ loadFfmpeg: vi.fn(), FframeError: class extends Error {}, ffmpeg: vi.fn() }));
vi.mock('../download-utils.ts', () => ({ triggerDownload: vi.fn(), applyAudioPostProcessing: vi.fn() }));
vi.mock('../ffmpegFormats.ts', () => ({ isCustomFormat: vi.fn(() => false) }));
vi.mock('../progressEvents.js', () => ({ DownloadProgress: class {} }));
vi.mock('../readableStreamIterator.js', () => ({ readableStreamIterator: vi.fn() }));
vi.mock('../HiFi.ts', () => ({
    HiFiClient: { instance: { query: vi.fn() } },
    TidalResponse: class {},
}));
vi.mock('../platform-detection.js', () => ({ isIos: false, isSafari: false, isChrome: true }));
vi.mock('../container-classes.js', () => ({
    TrackAlbum: class {},
    EnrichedAlbum: class {},
    EnrichedTrack: class {},
    ReplayGain: class {},
    PlaybackInfo: class {},
    Track: class {},
    Album: class {},
    PreparedVideo: class {},
    PreparedTrack: class {
        constructor(track) {
            Object.assign(this, track);
        }
    },
}));

// Mock authManager and getAuthToken
const mockGetAuthToken = vi.fn();
const mockAuthManager = {
    user: null
};

vi.mock('../accounts/auth.js', () => ({
    getAuthToken: mockGetAuthToken,
    authManager: mockAuthManager,
}));

const { LosslessAPI } = await import('../api.js');

describe('LosslessAPI.searchYoutubeMusic cookies and tokens', () => {
    let api;
    let fetchMock;

    beforeEach(() => {
        api = new LosslessAPI({});
        mockGetAuthToken.mockReturnValue('');
        mockAuthManager.user = null;
        localStorage.clear();
        document.cookie = '';

        // Mock fetch response
        fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                success: true,
                data: {
                    results: [
                        {
                            videoId: '123',
                            title: 'Song Title',
                            artist: { name: 'Artist Name' },
                            album: { name: 'Album Name' }
                        }
                    ]
                }
            })
        });
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('case 1: should retrieve specific youtube-cookie from localStorage and attach it', async () => {
        localStorage.setItem('youtube-cookie', 'my-special-yt-cookie-val');

        await api.searchYoutubeMusic('test-query');

        expect(fetchMock).toHaveBeenCalled();
        const requestUrl = fetchMock.mock.calls[0][0];
        const requestOptions = fetchMock.mock.calls[0][1];

        // Should include cookie in query parameters
        expect(requestUrl).toContain('cookie=my-special-yt-cookie-val');
        expect(requestUrl).toContain('token=my-special-yt-cookie-val');

        // Should include cookie in custom headers
        expect(requestOptions.headers['X-Youtube-Cookie']).toBe('my-special-yt-cookie-val');
        expect(requestOptions.headers['X-Auth-Token']).toBe('my-special-yt-cookie-val');
        expect(requestOptions.headers['Authorization']).toBe('Bearer my-special-yt-cookie-val');
    });

    test('case 2: should parse and retrieve YT cookies from document.cookie', async () => {
        document.cookie = 'foo=bar; __Secure-3PAPISID=my-apisid-val; LOGIN_INFO=my-login-info; unrelated=cookie';

        await api.searchYoutubeMusic('test-query');

        expect(fetchMock).toHaveBeenCalled();
        const requestUrl = fetchMock.mock.calls[0][0];
        const requestOptions = fetchMock.mock.calls[0][1];

        // Should filter and contain only the YT cookies
        expect(requestUrl).toContain(encodeURIComponent('__Secure-3PAPISID=my-apisid-val; LOGIN_INFO=my-login-info'));
        expect(requestOptions.headers['X-Youtube-Cookie']).toBe('__Secure-3PAPISID=my-apisid-val; LOGIN_INFO=my-login-info');
    });

    test('case 3: fallback to getAuthToken() when no YT cookies/tokens are in local storage or document.cookie', async () => {
        mockGetAuthToken.mockReturnValue('auth-token-xyz');

        await api.searchYoutubeMusic('test-query');

        expect(fetchMock).toHaveBeenCalled();
        const requestUrl = fetchMock.mock.calls[0][0];
        const requestOptions = fetchMock.mock.calls[0][1];

        expect(requestUrl).toContain('cookie=auth-token-xyz');
        expect(requestOptions.headers['Authorization']).toBe('Bearer auth-token-xyz');
    });
});
