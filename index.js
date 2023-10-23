import fs from 'fs'

console.log("Welcome to Quizzer!");

const TOK = fs.readFileSync('token.secret')

const COURSE_ID = "376033"

const QUIZ_ID = process.argv[2]
const QUESTION_ID = process.argv[3]
const isGo = process.argv.length === 5 && process.argv[4].toLowerCase() === 'go'

console.log("Running on Quiz #" + QUIZ_ID + " for Question #" + QUESTION_ID);

if (isGo) {
    console.log("Running in GO mode... I hope you made a backup!")
} else {
    console.log("Running in prelim mode...")
}

const data = await fetchLinkableData(`https://canvas.wisc.edu/api/v1/courses/${COURSE_ID}/quizzes/${QUIZ_ID}/submissions?per_page=100`)
const subs = unravelAt(data, "quiz_submissions")
const idsWithSubs = subs.filter(sub => sub.started_at).map(sub => sub.id);

console.log(`${idsWithSubs.length} of ${subs.length} submitted!`)

if (isGo) {
    for (let subId of idsWithSubs) {
        console.log(`Submitting grade for ${subId}...`)
        const hders = await fetch(`https://canvas.wisc.edu/api/v1/courses/${COURSE_ID}/quizzes/${QUIZ_ID}/submissions/${subId}`, {
            method: "PUT",
            headers: {
                'Authorization': 'Bearer ' + TOK,
                'Content-Type': "application/json"
            },
            body: JSON.stringify({
                "quiz_submissions": [{
                  "attempt": 1,
                  "questions": {
                    [QUESTION_ID]: {
                      "score": 0.2
                    }
                  }
                }]
              })
        })
        const status = hders.status
        if (status !== 200) {
            console.error(`!!! ERROR SUBMITTING GRADE FOR ${subId} !!! ${status}`)
        }
        await delay(250 + Math.random() * 500)
    }
}

// https://masteringjs.io/tutorials/fundamentals/wait-1-second-then
async function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}
  

function unravelAt(data, attr) {
    return data.map(d => d[attr]).reduce((acc, curr) => [...acc, ...curr], [])
}

async function fetchLinkableData(url) {
    const resp = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + TOK
        }
    })
    const lnks = parse_link_header(resp.headers.get('Link'));
    const data = [await resp.json()];
    if (lnks.next) {
        return data.concat(await fetchLinkableData(lnks.next));
    } else {
        return data;
    }
}

// https://gist.github.com/niallo/3109252?permalink_comment_id=1474669#gistcomment-1474669
function parse_link_header(header) {
    if (header.length === 0) {
        throw new Error("input must not be of zero length");
    }

    // Split parts by comma
    var parts = header.split(',');
    var links = {};
    // Parse each part into a named link
    for(var i=0; i<parts.length; i++) {
        var section = parts[i].split(';');
        if (section.length !== 2) {
            throw new Error("section could not be split on ';'");
        }
        var url = section[0].replace(/<(.*)>/, '$1').trim();
        var name = section[1].replace(/rel="(.*)"/, '$1').trim();
        links[name] = url;
    }
    return links;
}