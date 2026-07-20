1 simple request attach the cookie or token or whatever to searchYoutubeMusic in  before making the request so thatserver can cache it



and by token i mean google cookie or token whatever is compatible with https://github.com/yt-dlp/yt-dlp package in backend to process yt-dlp request since yt-dlp need cookie


3.) i dont think you understand. i literally dont care about anyhtign else but the google/youtube-music token. not any other. just obtain that and attach to searchYoutubeMusic.

4.) wtf is OPTIONS
	http://localhost:3000/api/search?q=dracula&filter=songs&cookie=__next_hmr_refresh_hash__=44&token=__next_hmr_refresh_hash__=44

    OPTIONS /api/search?q=dracula&filter=songs&cookie=__next_hmr_refresh_hash__%3D44&token=__next_hmr_refresh_hash__%3D44 HTTP/1.1
Host: localhost:3000
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0
Accept: */*
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br, zstd
Access-Control-Request-Method: GET
Access-Control-Request-Headers: authorization,x-auth-token,x-session-token,x-youtube-cookie //yeah, im blind.
Origin: http://localhost:5173
Sec-GPC: 1
Connection: keep-alive
Sec-Fetch-Dest: empty
Sec-Fetch-Mode: cors
Sec-Fetch-Site: same-site
Priority: u=4
Pragma: no-cache
Cache-Control: no-cache



5.) reset everything just tell me top 10 ways (yeah top 10 ways because you dont know your shit and i have to vorrect you at every point )how will you obtain log youtube-music cookie to console.log()

6.)context? the app already supports login using google!!!

7.) check if token works for yt-dlp or strictly cookies only required