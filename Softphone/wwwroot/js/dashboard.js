(function($) {
    'use strict'; 
    $(function() {

        //Call Status Disrtibution Chart
        if ($("#call-status-distribution").length) {
            var ctx = document.getElementById("call-status-distribution").getContext("2d");
            var pieChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Queued', 'Ringing', 'In Progress', 'Completed', 'Busy', 'Failed', 'No Answer', 'Cancelled'],
                    datasets: [{
                        data: [10, 9, 20, 15, 10, 14, 12, 10],
                        backgroundColor: [
                            'rgba(249, 168, 37, 0.8)',
                            'rgba(0, 188, 212, 0.8)',
                            'rgba(21, 101, 192, 0.8)',
                            'rgba(67, 160, 71, 0.8)',
                            'rgba(239, 83, 80, 0.8)',
                            'rgba(183, 28, 28, 0.8)',
                            'rgba(144, 164, 174, 0.8)',
                            'rgba(84, 110, 122, 0.8)'
                        ],
                        borderColor: [
                            'rgba(249, 168, 37, 1)',
                            'rgba(0, 188, 212, 1)',
                            'rgba(21, 101, 192, 1)',
                            'rgba(67, 160, 71, 1)',
                            'rgba(239, 83, 80, 1)',
                            'rgba(183, 28, 28, 1)',
                            'rgba(144, 164, 174, 1)',
                            'rgba(84, 110, 122, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        datalabels: {
                            color: 'white',
                            font: { weight: 'bold' },
                            formatter: (val) => `${val}%`
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });
        }

        //Weekly Call Metrics Chart
        if ($("#weekly-call-metrics").length) {
            var ctx = document.getElementById('weekly-call-metrics').getContext('2d');
            var barChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [
                        {
                            label: 'Inbound',
                            data: [26, 39, 13, 25, 22, 33, 44],
                            backgroundColor: 'rgba(13, 71, 161, 0.8)',
                            borderColor: 'rgba(13, 71, 161, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Outbound',
                            data: [22, 28, 15, 15, 12, 23, 37],
                            backgroundColor: 'rgba(33, 150, 243, 0.8)',
                            borderColor: 'rgba(33, 150, 243, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    scales: {
                        xAxes: [{
                            gridLines: {
                                display: false,
                                drawBorder: false
                            }
                        }],
                        yAxes: [{
                            ticks: {
                                stepSize: 10,
                                min: 0,
                                max: 50
                            },
                            gridLines: {
                                drawBorder: false,
                            }
                        }]
                    },
                    plugins: {
                        datalabels: {
                            color: 'white',
                            font: { weight: 'bold' },
                            formatter: (val) => val
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });

            //var salesChartCanvas = $("#weekly-call-metrics").get(0).getContext("2d");
            //var gradient1 = salesChartCanvas.createLinearGradient(0, 0, 0, 230);
            //gradient1.addColorStop(0, '#55d1e8');
            //gradient1.addColorStop(1, 'rgba(255, 255, 255, 0)');

            //var gradient2 = salesChartCanvas.createLinearGradient(0, 0, 0, 160);
            //gradient2.addColorStop(0, '#1bbd88');
            //gradient2.addColorStop(1, 'rgba(255, 255, 255, 0)');

            //var salesChart = new Chart(salesChartCanvas, {
            //    type: 'line',
            //    data: {
            //        labels: ["2am", "4am", "6am", "8am", "10am", "12am"],
            //        datasets: [{
            //            data: [80, 115, 115, 150, 130, 160],
            //            backgroundColor: gradient1,
            //            borderColor: [
            //                '#08bdde'
            //            ],
            //            borderWidth: 2,
            //            pointBorderColor: "#08bdde",
            //            pointBorderWidth: 4,
            //            pointRadius: 1,
            //            fill: 'origin',
            //        },
            //        {
            //            data: [250, 310, 270, 330, 270, 380],
            //            backgroundColor: gradient2,
            //            borderColor: [
            //                '#00b67a'
            //            ],
            //            borderWidth: 2,
            //            pointBorderColor: "#00b67a",
            //            pointBorderWidth: 4,
            //            pointRadius: 1,
            //            fill: 'origin',
            //        }
            //        ]
            //    },
            //    options: {
            //        responsive: true,
            //        maintainAspectRatio: true,
            //        plugins: {
            //            filler: {
            //                propagate: false
            //            }
            //        },
            //        scales: {
            //            xAxes: [{
            //                ticks: {
            //                    fontColor: "#bababa"
            //                },
            //                gridLines: {
            //                    display: false,
            //                    drawBorder: false
            //                }
            //            }],
            //            yAxes: [{
            //                ticks: {
            //                    fontColor: "#bababa",
            //                    stepSize: 100,
            //                    min: 0,
            //                    max: 500
            //                },
            //                gridLines: {
            //                    drawBorder: false,
            //                    color: "rgba(101, 103, 119, 0.21)",
            //                    zeroLineColor: "rgba(101, 103, 119, 0.21)"
            //                }
            //            }]
            //        },
            //        legend: {
            //            display: false
            //        },
            //        tooltips: {
            //            enabled: true
            //        },
            //        elements: {
            //            line: {
            //                tension: 0
            //            }
            //        },
            //        legendCallback: function (chart) {
            //            var text = [];
            //            text.push('<div>');
            //            text.push('<div class="d-flex align-items-center">');
            //            text.push('<span class="bullet-rounded" style="border-color: ' + chart.data.datasets[1].borderColor[0] + ' "></span>');
            //            text.push('<p class="tx-12 text-muted mb-0 ml-2">Gross volume</p>');
            //            text.push('</div>');
            //            text.push('<div class="d-flex align-items-center">');
            //            text.push('<span class="bullet-rounded" style="border-color: ' + chart.data.datasets[0].borderColor[0] + ' "></span>');
            //            text.push('<p class="tx-12 text-muted mb-0 ml-2">New Cusromers</p>');
            //            text.push('</div>');
            //            text.push('</div>');
            //            return text.join('');
            //        },
            //    }
            //});
        }


    });
})(jQuery);



