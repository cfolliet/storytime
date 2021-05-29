const fetch = require('node-fetch');

export async function get(req, res, next) {
    const { host, email, token } = req.query;

    const filters = await getFilters(host, email, token);

    if (filters !== null) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(filters));
    } else {
        next();
    }
}

async function getFilters(host, email, token) {
    let response;
    try {
        response = await fetch(host + '/rest/api/2/filter/search?filterName=guesstimate&expand=jql', {
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

    const data = await response.json();
    return data.values;
}