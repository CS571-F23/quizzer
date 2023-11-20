import fs from 'fs'

console.log("Welcome to Quizzer!");

const TOK = fs.readFileSync('token.secret')

const SKIP_WAIT = false;


// const COURSE_ID = "376033" // CS571
const COURSE_ID = "374263" // CS220
const QUIZ_ID = "493572";
const QUESTION_ID = "5910878";
const ASSIGNMENT_ID = "2110295";
const POINT_VAL = 2.0;


console.log("About to modify the gradebook, please make a backup first!");
console.log("Ctrl+C to cancel or forever hold your peace....")

if (!SKIP_WAIT) {
    await delay(10 * 1000)
}

console.log("Running on Quiz #" + QUIZ_ID + " for Question #" + QUESTION_ID);

const subDeets = unravel(await fetchLinkableData(`https://canvas.wisc.edu/api/v1/courses/${COURSE_ID}/assignments/${ASSIGNMENT_ID}/submissions?include[]=submission_history&per_page=100`));
const results = [];

for(let datum of subDeets) {
    for(let sub of datum.submission_history) {
        // 7232
        if(sub.submission_data) { // skip students that do not have a submission
            const qRes = sub.submission_data.find(d => String(d.question_id) === QUESTION_ID)
            // const qResText = qRes.text; // check sub response body
            // const qResAttach = qRes?.attachment_ids; // check attachments
            // results.push({
            //     subId: sub.id,
            //     userId: sub.user_id,
            //     attempt: sub.attempt,
            //     score: qResAttach ? POINT_VAL : 0
            // })

            // If they checked it, give them credit
            if(qRes['answer_7232'] === "1") {
                const pts = qRes.points
                const low = Math.floor(qRes.points)
                const rem = qRes.points - Math.floor(low);
                let newScore = low + 0.3333333;
                if(rem >= 0.32 && rem <= 0.34) {
                    newScore = low + 0.6666667;
                } else if (rem >= 0.65 && low <= 0.67) {
                    newScore = low + 1;
                }
                console.log(`Changing score for ${sub.id} from ${qRes.points} to ${newScore}!`)
                results.push({
                    subId: sub.id,
                    userId: sub.user_id,
                    attempt: sub.attempt,
                    score: newScore
                })
            }
        }
    }
}

for (let result of results) {
    const subId = result.subId;
    const userId = result.userId;
    console.log(`Submitting grade for U:${result.userId} S:${subId}...`)
    const hders = await fetch(`https://canvas.wisc.edu/api/v1/courses/${COURSE_ID}/quizzes/${QUIZ_ID}/submissions/${subId}`, {
        method: "PUT",
        headers: {
            'Authorization': 'Bearer ' + TOK,
            'Content-Type': "application/json"
        },
        body: JSON.stringify({
            "quiz_submissions": [{
              "attempt": result.attempt,
              "questions": {
                [QUESTION_ID]: {
                  "score": result.score
                }
              }
            }]
          })
    })
    const status = hders.status
    if (status !== 200) {
        console.error(`!!! ERROR SUBMITTING GRADE FOR U:${result.userId} S:${subId} !!! ${status}`)
    }
    await delay(250 + Math.random() * 500)
}

console.log("Complete!");

// https://masteringjs.io/tutorials/fundamentals/wait-1-second-then
async function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}
  

function unravel(data, attr) {
    return data.map(d => attr ? d[attr] : d).reduce((acc, curr) => [...acc, ...curr], [])
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