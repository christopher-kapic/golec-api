const express = require('express');
const fetch = require('node-fetch');

const cors = require('cors');
// if (process.env.NODE_ENV !== 'production') {
//     require('dotenv').config();
// }

const app = express();
app.use(cors());
app.use(express.json());

async function loadTranscripts(videoIds){
    // Returns an array of promises
    let to_return = []
    videoIds.forEach(
        (videoId) => {
            if (videoId == null) {
                to_return.push(null)
            } else {
            to_return.push(
                fetch(`https://subtitles-for-youtube.p.rapidapi.com/subtitles/${videoId}`, {
                    "method": "GET",
                    "headers": {
                        "x-rapidapi-key": "53fa8d6d8fmsh3db759a118a047cp14ac38jsnc25fc8245efc",
                        "x-rapidapi-host": "subtitles-for-youtube.p.rapidapi.com"
                    }
                    }
                )
            )
            }
        }
    )
    return to_return;
}


async function Search(req, res, next) {
    const search = req.params.primary_search;
    console.log(search);
    // const search = 'christopher%2Ckapic'
    const subsearch = req.params.secondary_search;
    // const subsearch = 'zone';
    const range = 20;
    const response = await fetch(`https://youtube-v31.p.rapidapi.com/search?q=${search}%2Clecture&part=snippet%2Cid&regionCode=US&maxResults=${range}`, {
	"method": "GET",
	"headers": {
		"x-rapidapi-key": "53fa8d6d8fmsh3db759a118a047cp14ac38jsnc25fc8245efc",
		"x-rapidapi-host": "youtube-v31.p.rapidapi.com"
	}
    })
    const data = await response.json();
    let videoIds = []
    for (i = 0; i < range; i++) {
        if (data.items[i].id.kind != 'youtube#video') {
            videoIds.push(null);
        } else {
        videoIds.push(data.items[i].id.videoId);
        }
    }
    transcript_promises = await loadTranscripts(videoIds);
    console.log("transcript_promises:")
    console.log(transcript_promises);
    let to_return = []
    for (i = 0; i < range; i++) {
        if (data.items[i].id.kind != 'youtube#video') {
            continue
        }
        to_return[i] = {
            title: data.items[i].snippet.title,
            id: data.items[i].id.videoId,
            channel: data.items[i].snippet.channelTitle,
            thumbnail: data.items[i].snippet.thumbnails.medium.url,
            description: data.items[i].snippet.description,
            links: [],
            length: 0
        }
    }

        for (j = 0; j < transcript_promises.length; j++) {
            const id = data.items[j].id.videoId;
            if (!transcript_promises[j]){
                continue
            }
            const transcript = await transcript_promises[j]
            console.log(j);
            let transcript_json = 'oops';
            try {
                transcript_json = await transcript.json();
            } catch {
                continue
            }
            console.log(transcript_json);
            for (k = 0; k < transcript_json.length; k++) {
                if (transcript_json[k].text && transcript_json[k].text.indexOf(subsearch) !== -1) {
                    to_return[j].links.push(`https://youtu.be/${id}?t=${Math.floor(transcript_json[k].start)}`);
                }
                try {
                    to_return[j].length = Math.floor(transcript_json[k].end);
                } catch {
                    console.log("No end timestamp");
                }
            }
        }
	function notNull(item) {
		return (item != null)
	}
	to_return = to_return.filter(notNull);
    
    res.status(200).send(to_return);
}

// Routes
app.get('/search/:primary_search/:secondary_search', Search);
app.get('/', Search);
// app.post('/addKey', addKey)

app.listen(5000, () => {
    console.log(`App listening on port 5000`);
});
