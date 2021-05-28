<script>
    import { onMount } from "svelte";
    import Chart from "chart.js";

    let jql;
    let analyze = 13;
    let filters = [
        {
            name: "Select JQL from your filters (must contain 'guesstimate' in his name)...",
            value: null,
        },
    ];
    let data;
    let host;
    let email;
    let token;

    onMount(() => {
        const url = new URL(window.location.href);
        analyze = url.searchParams.get("analyze") || 13;
        jql = url.searchParams.get("jql");
        host = url.searchParams.get("host");
        email = url.searchParams.get("email");
        token = url.searchParams.get("token");
    });

    function settingsChanged() {
        const url = new URL(window.location.href);
        url.searchParams.set("analyze", analyze);
        url.searchParams.set("jql", jql);
        url.searchParams.set("host", host);
        url.searchParams.set("email", email);
        url.searchParams.set("token", token);
        window.history.pushState(null, null, url);
    }

    function selectFilterBlur() {
        const element = document.getElementById("select-filter");
        if (element.value != "undefined") {
            jql = element.value;
            element.selectedIndex = 0;
            settingsChanged();
        }
    }

    $: loadFilters(host, email, token);
    async function loadFilters(host, email, token) {
        if (!host || !email || !token) {
            return;
        }
        const url =
            "filtersApi?" +
            new URLSearchParams({
                host,
                email,
                token,
            });
        const res = await fetch(url);
        const result = await res.json();
        filters = filters.concat(result);
    }

    let promiseData = null;
    $: loadData(host, email, token, jql, analyze);
    async function loadData(host, email, token, jql, analyze) {
        if (!host || !email || !token || !jql) {
            return;
        }

        data = null;
        const url =
            "analyzeApi?" +
            new URLSearchParams({
                jql: encodeURIComponent(jql),
                analyze: analyze,
                host,
                email,
                token,
            });
        promiseData = fetch(url);
        const res = await promiseData;
        data = await res.json();
    }

    function renderChart(node) {
        let ctx = node;
        let chart;

        return {
            update(data) {
                if (!data || data.error) {
                    return;
                }
                /*
                chart = new Chart(ctx, {
                    type: "bar",
                    data: {
                        datasets: [
                            {
                                label: "new issues",
                                data: data.datasets.new,
                                backgroundColor: "#ffe0e6",
                                borderColor: "#ff7c98",
                                borderWidth: "1",
                            },
                            {
                                label: "issues done",
                                data: data.datasets.done,
                                backgroundColor: "#dbf2f2",
                                borderColor: "#68caca",
                                borderWidth: "1",
                            },
                            {
                                label: "remains to be done",
                                data: data.datasets.todo,
                                type: "line",
                                fill: false,
                                backgroundColor: "#d7ecfb",
                                borderColor: "#d4ebfb",
                            },
                            {
                                label: "20% confidence",
                                data: data.datasets.twenty,
                                borderDash: [3, 3],
                                type: "line",
                                fill: false,
                                backgroundColor: "#ffe0e6",
                                borderColor: "#ff7c98",
                            },
                            {
                                label: "50% confidence",
                                data: data.datasets.fifty,
                                borderDash: [3, 3],
                                type: "line",
                                fill: false,
                                backgroundColor: "#fff5dd",
                                borderColor: "#ffd36c",
                            },
                            {
                                label: "80% confidence",
                                data: data.datasets.heighty,
                                borderDash: [3, 3],
                                type: "line",
                                fill: false,
                                backgroundColor: "#dbf2f2",
                                borderColor: "#68caca",
                            },
                        ],
                    },
                    options: {
                        title: {
                            display: true,
                            text: "Percentage of confidence in finishing all issues",
                        },
                        scales: {
                            xAxes: [
                                {
                                    type: "time",
                                    time: {
                                        unit: "week",
                                        isoWeekday: true,
                                        displayFormats: {
                                            week: "D MMM YYYY",
                                        },
                                        tooltipFormat: "D MMM YYYY",
                                    },
                                },
                            ],
                            yAxes: [
                                {
                                    ticks: {
                                        beginAtZero: true,
                                        precision: 0,
                                        suggestedMax: 3,
                                    },
                                },
                            ],
                        },
                    },
                });
                */
            },
            destroy() {
                if (chart) {
                    chart.destroy();
                }
            },
        };
    }
</script>

<section>
    <aside>
        <details>
            <summary
                ><small>Jira Parameters</small>
                {#if !host || !email || !token}
                    <mark> ⚠️ You need to put your credentials here</mark>
                {/if}</summary
            >
            <p>
                <input
                    type="text"
                    bind:value={host}
                    placeholder="Jira host (ex: https://my-company.atlassian.net)..."
                    on:change={settingsChanged}
                />
                <input
                    type="text"
                    bind:value={email}
                    placeholder="Your email..."
                    on:change={settingsChanged}
                />
                <input
                    type="text"
                    bind:value={token}
                    placeholder="Jira token..."
                    on:change={settingsChanged}
                />
                <small
                    ><a
                        href="https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/"
                        target="_blank">How to get my token ?</a
                    ></small
                >
            </p>
            <hr />
        </details>
        <p>
            <select id="select-filter" on:blur={selectFilterBlur}>
                {#each filters as filter}
                    <option value={filter.jql}>
                        {filter.name}
                    </option>
                {/each}
            </select>
            <input
                type="text"
                placeholder="Analyze issues based on JQL... ex: 'Epic Link' in (CAR-XXX, CAR-YYY)"
                bind:value={jql}
                on:change={settingsChanged}
            />
            {#if data && data.error}
                <samp>{data.error}</samp>
                <br />
            {/if}
            <span>
                Analyze over the last
                <input
                    type="number"
                    bind:value={analyze}
                    min="2"
                    on:change={settingsChanged}
                />
                weeks</span
            >
            <br />
            <small>💡 Bookmark the current URL to save the settings</small>
        </p>
    </aside>
</section>
<section id="content">
    <aside>
        {#await promiseData}
            <p>Loading...</p>
        {:then}
            <canvas use:renderChart={data} id="chart" width="5" height="2" />
        {/await}
    </aside>
</section>

<style>
    aside {
        width: 100%;
    }

    details {
        margin: 0;
    }

    input[type="text"] {
        width: 100%;
    }

    input[type="number"] {
        width: 50px;
        display: inline-block;
    }

    samp {
        border: 1px solid #ff7c98;
        background-color: #ffe0e6;
    }
</style>
