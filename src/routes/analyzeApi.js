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
            const issues = await getIssues(host, email, token, decodeURIComponent(jql));
            getAnalysis(issues);
            data.issues = issues
        }
    }

    data.error = lastError;
    getCustomField(host, email, token);

    /*
    if (events) {
        let filteredEvents;

        let analyzeBeginDate = dateFns.subWeeks(new Date(), analyze);
        filteredEvents = events.filter(e => dateFns.isAfter(e.date, analyzeBeginDate))

        const simulations = getSimulations(filteredEvents);
        const datasets = getDatasets(filteredEvents, simulations)

        data.datasets = datasets;
        data.statistics = getStatistics(data);
    }
    */

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
    console.log("Getting analysis")
    let result = [];

    issues.forEach(issue => {
        let startProgress;
        let endProgress;
        issue.changelog.histories.forEach(history => {
            history.items.forEach(item => {
                if (item.field == 'status') {
                    if (item.toString == 'In Progress') {
                        startProgress = history.created
                    }
                    else if (item.fromString == 'In Progress' && item.toString == 'Peer review') {
                        endProgress = history.created
                    }
                }
            })
        })

        if (startProgress != null && endProgress != null) {
            result.push({ key: issue.key, sp: issue.fields.customfield_10004, startProgress, endProgress })
        }
    })

    console.log(result);
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