const fetch = require('node-fetch');
const dateFns = require('date-fns');

let lastJql;
let events;
let lastError;

export async function get(req, res, next) {
    const { jql, analyze, host, email, token } = req.query;
    const data = {};

    if (jql != lastJql) {
        events = null
        lastJql = jql;
        lastError = await validateJql(host, email, token, decodeURIComponent(jql));
        if (!lastError) {
            // getCustomField(host, email, token);
            const issues = await getIssues(host, email, token, decodeURIComponent(jql));
            const analysis = getAnalysis(issues);
            data.datasets = getDatasets(analysis)
        }
    }

    data.error = lastError;

    if (data !== null) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
    } else {
        next();
    }
}

async function validateJql(host, email, token, jql) {
    let response;
    try {
        const bodyData = {
            "queries": [jql]
        };
        response = await fetch(`${host}/rest/api/2/jql/parse`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(
                    email + ':' + token
                ).toString('base64')}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
        })
        let result = await response.json();
        const errors = result.queries[0].errors
        return errors != undefined ? errors.join(';') : null
    } catch (error) {
        console.log(error);
    }
}

async function getIssues(host, email, token, jql) {
    const fields = ['resolutiondate', 'created', 'customfield_10004'];
    const expand = ['changelog', 'names'];
    let result;
    let issues;

    let response;
    try {
        response = await fetch(`${host}/rest/api/2/search?jql=${jql}&fields=${fields}&expand=${expand}&maxResults=100&startAt=0`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(
                    email + ':' + token
                ).toString('base64')}`,
                'Accept': 'application/json'
            }
        })
    } catch (error) {
        console.log(error);
    }

    result = await response.json();
    issues = result.issues;

    while (issues.length < result.total) {
        try {
            response = await fetch(`${host}/rest/api/2/search?jql=${jql}&fields=${fields}&expand=${expand}&maxResults=100&startAt=${issues.length}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${Buffer.from(
                        email + ':' + token
                    ).toString('base64')}`,
                    'Accept': 'application/json'
                }
            })

            result = await response.json();
            issues = [...issues, ...result.issues];
        } catch (error) {
            console.log(error);
        }
    }

    return issues;
}

function getAnalysis(issues) {
    let result = [];

    issues.forEach(issue => {
        if (issue.fields.customfield_10004 == null) {
            return;
        }

        let startProgress;
        let endProgress;
        issue.changelog.histories.forEach(history => {
            history.items.forEach(item => {
                if (item.field == 'status') {
                    if (item.toString == 'In Progress') {
                        startProgress = dateFns.parseJSON(history.created)
                    }
                    //else if (item.fromString == 'In Progress' && item.toString == 'Peer review') {
                    else if (item.fromString == 'In Progress') {
                        endProgress = dateFns.parseJSON(history.created)
                    }
                }
            })
        })

        if (startProgress != null && endProgress != null) {
            const duration = dateFns.differenceInBusinessDays(endProgress, startProgress)
            const entry = { key: issue.key, sp: issue.fields.customfield_10004, startProgress, endProgress, duration }
            result.push(entry)
        }
    })

    return result;
}

function getDatasets(entries) {
    const all = []
    const bysp = [];
    const datasets = { all, bysp };

    entries.forEach((entry, index) => {
        let item = all.find(i => i.x == entry.duration && i.y == entry.sp)
        if (item == null) {
            item = { x: entry.duration, y: entry.sp, r: 0 }
            all.push(item);
        }
        item.r += 3;

        // stats
        item = bysp.find(i => i.sp == entry.sp)
        if (item == null) {
            item = { sp: entry.sp, count: 0, duration: 0, durations: [], keys: [] }
            bysp.push(item);
        }
        item.count++;
        item.duration += entry.duration;
        item.durations.push(entry.duration)
        item.keys.push(entry.key)
    })

    bysp.forEach(item => {
        item.average = item.duration / item.count;
        item.median = median(item.durations)
    })
    bysp.sort((a, b) => a.sp - b.sp)

    return datasets;
}

async function getCustomField(host, email, token, fieldName = 'Story Points') {
    let response = await fetch(`${host}/rest/api/2/field`, {
        method: 'GET',
        headers: {
            'Authorization': `Basic ${Buffer.from(
                email + ':' + token
            ).toString('base64')}`,
            'Accept': 'application/json'
        }
    })
    let result = await response.json();
    result = result.filter(r => r.name == fieldName);
    console.log(result);
}

function median(values) {
    if (values.length === 0) return 0;
    values = [...values];

    values.sort(function (a, b) {
        return a - b;
    });

    var half = Math.floor(values.length / 2);

    if (values.length % 2)
        return values[half];

    return (values[half - 1] + values[half]) / 2.0;
}