const fetch = require('node-fetch');
const ytdl = require('ytdl-core');
const { bot } = require('../lib');
const { PREFIX } = require('../lib');
const fs = require('fs');

// Directly using YouTube and Genius API keys
const YOUTUBE_API_KEY = 'AIzaSyCGZyWMH1aNh3oOScb2Y5QJeKOVeqkb_Gw';
const GENIUS_API_KEY = '1-N_qxYSNnK9p2MZ2Y2K203q4WVD6kcqzkQnrpM01nuciA3P-qKhOXGGuwRaVSdF';

bot(
    {
        pattern: 'song ?(.*)',
        fromMe: true,
        desc: 'Get song audio and lyrics',
        type: 'music',
    },
    async (message, match) => {
        const songName = match.trim();

        if (!songName) {
            return await message.send('Please provide the song name \nEx: .song Despacito');
        }

        // Fetch song information from YouTube
        const youtubeSearchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(songName)}+audio&type=video&key=${YOUTUBE_API_KEY}`;
        const youtubeResponse = await fetch(youtubeSearchUrl);
        const youtubeData = await youtubeResponse.json();

        if (youtubeData.items.length === 0) {
            return await message.send('No audio found for this song.');
        }

        const videoId = youtubeData.items[0].id.videoId;
        const audioStream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, { filter: 'audioonly' });

        const audioFileName = `${songName}.mp3`;
        const audioWriteStream = fs.createWriteStream(audioFileName);
        audioStream.pipe(audioWriteStream);

        // Fetch song lyrics from Genius API
        const geniusSearchUrl = `https://api.genius.com/search?q=${encodeURIComponent(songName)}`;
        const geniusResponse = await fetch(geniusSearchUrl, {
            headers: {
                Authorization: `Bearer ${GENIUS_API_KEY}`
            }
        });
        const geniusData = await geniusResponse.json();

        let lyrics = 'Lyrics not found.';
        if (geniusData.response.hits.length > 0) {
            const songPath = geniusData.response.hits[0].result.path;
            const lyricsPageUrl = `https://genius.com${songPath}`;
            lyrics = `Find lyrics at: ${lyricsPageUrl}`;
        }

        audioWriteStream.on('finish', async () => {
            // Send audio file
            await message.sendFromUrl(audioFileName, {
                mimetype: 'audio/mp3',
                filename: `${songName}.mp3`
            });

            // Send lyrics or lyrics link
            await message.send(`*Lyrics for ${songName}:*\n${lyrics}`);

            // Clean up file after sending
            fs.unlinkSync(audioFileName);
        });
    }
);
