function display_graph(textGraph, dtype) {
    d3.json('./Controller', {
        method: 'POST',
        body: JSON.stringify({
            dtype: dtype,
            graph: textGraph
        }),
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        }
    }).then(data => {
        // minimum eigenvalue
        var eigenvalueString = data.eigenvalue.replace(',', '.');
        var eigenvalue = parseFloat(eigenvalueString);

        // angular coefficient of the x axis
        var dtypeCoefficient = parseFloat(data.dType); // switch to invert

        // minimum and maximum coordinates
        var min_x = Number.MAX_VALUE;
        var max_x = Number.MIN_VALUE;
        var min_y = Number.MAX_VALUE;
        var max_y = Number.MIN_VALUE;

        // nodes
        var nodes = {};
        var raw_nodes = data.nodes;
        for (var i = 0; i < raw_nodes.length; i++) {
            var id = raw_nodes[i].id;

            var x = parseFloat(raw_nodes[i].x); // switch to invert
            var y = parseFloat(raw_nodes[i].y);
            if (eigenvalue !== 0 && dtypeCoefficient !== 0) {
                y = x * dtypeCoefficient;
            }

            nodes[id] = {
                'x': x,
                'y': y,
                'old_x': x,
                'old_y': y
            };

            min_x = Math.min(min_x, x);
            max_x = Math.max(max_x, x);
            min_y = Math.min(min_y, y);
            max_y = Math.max(max_y, y);
        }

        // inter edges
        var inter_edges = [];
        var raw_inter_edges = data.interEdges;
        for (var i = 0; i < raw_inter_edges.length; i++) {
            inter_edges.push({
                'source': raw_inter_edges[i].source,
                'target': raw_inter_edges[i].target,
                'sign': raw_inter_edges[i].sign
            });
        }

        // intra edges
        var intra_edges = [];
        var raw_intra_edges = data.intraEdges;
        for (var i = 0; i < raw_intra_edges.length; i++) {
            intra_edges.push({
                'source': raw_intra_edges[i].source,
                'target': raw_intra_edges[i].target,
                'consecutive': raw_intra_edges[i].consecutive,
                'sign': raw_intra_edges[i].sign
            });
        }

        // variables for drawing
        var width = 1280;
        var height = 720;
        var mid_width = width / 2;
        var mid_height = height / 2;

        // rescale the coordinates based on the size of the drawing area
        var new_scale_x = d3.scaleLinear().domain([-1, 1]).range([50, width - 50]);
        var new_scale_y = d3.scaleLinear().domain([min_y, max_y]).range([mid_height, 30]);
        if (eigenvalue !== 0 && dtypeCoefficient !== 0) {
            new_scale_y = d3.scaleLinear().domain([-1, 1]).range([height - 30, 30]);
        }
        for (var i = 0; i < raw_nodes.length; i++) {
            nodes[i].x = new_scale_x(nodes[i].x);
            nodes[i].y = new_scale_y(nodes[i].y);
        }

        // clean the page from other svg objects
        d3.select('#svg').selectAll('*').remove();

        // draw a new svg object
        var svg = d3.select('#svg').append('svg')
            .attr('width', width)
            .attr('height', height);

        var scale_y_eizero = d3.scaleLinear().domain([min_y, max_y]).range([mid_height, 30]);
        // show the axes
        if (eigenvalue === 0) {
            svg.append('line')
                .attr('x1', new_scale_x(-1))
                .attr('y1', mid_height)
                .attr('x2', new_scale_x(1))
                .attr('y2', mid_height)
                .attr('stroke-width', 2.5)
                .attr('stroke', 'black');
        } else {
            svg.append('line')
                .attr('x1', new_scale_x(-1))
                .attr('y1', mid_height + (mid_height - 30) * dtypeCoefficient)
                .attr('x2', new_scale_x(1))
                .attr('y2', mid_height - (mid_height - 30) * dtypeCoefficient)
                .attr('stroke-width', 2.5)
                .attr('stroke', 'black');
            // x-axis 0
            /*svg.append('line')
                    .attr('x1', 50)
                    .attr('y1', scale_y_eizero(0))
                    .attr('x2', width - 50)
                    .attr('y2', scale_y_eizero(0))
                    .attr('stroke-width', 2.5)
                    .attr('stroke-dasharray', 4)
                    .attr('stroke', 'grey');*/
            svg.append('line')
                .attr('x1', new_scale_x(-1))
                .attr('y1', (mid_height + (mid_height - 30) * dtypeCoefficient) - new_scale_y(-1))
                .attr('x2', new_scale_x(1))
                .attr('y2', (mid_height - (mid_height - 30) * dtypeCoefficient) - new_scale_y(1))
                .attr('stroke-width', 2.5)
                .attr('stroke-dasharray', 4)
                .attr('stroke', 'black');
        }

        svg.append('line')
            .attr('x1', new_scale_x(0))
            .attr('y1', 30)
            .attr('x2', new_scale_x(0))
            .attr('y2', height - 30)
            .attr('stroke-width', 2.5)
            .attr('stroke', 'black');

        // print y-axis interception label
        svg.append('text')
            .attr('transform', 'translate(' + (mid_width + 65) + ', ' + 65 + ')')
            .style('text-anchor', 'middle')
            .style('font-size', '30px')
            .text(' y = ' + eigenvalueString);

        var kkk = (new_scale_y(0) + 20);
        // print x-axis interception label
        svg.append('text')
            .attr('transform', 'translate(' + (width - 100) + ', ' + (/*new_scale_y(0)*/ scale_y_eizero(0) + 20) + ')')
            .style('text-anchor', 'middle')
            .style('font-size', '10px')
            .text(' x = ' + new_scale_x(0));

        // print inter edges
        svg.selectAll('mylinks')
            .data(inter_edges)
            .enter()
            .append('path')
            .attr('d', function (d) {
                start = nodes[d.source].x;
                end = nodes[d.target].x;
                start_y = nodes[d.source].y;
                end_y = nodes[d.target].y;
                if (d.sign === '+') {
                    orientation = 1; // switch to invert
                } else {
                    orientation = 0; // switch to invert
                }

                return ['M', start, start_y, 'A',
                    (start - end) / 1.225, ',',
                    (start - end), 0, 0, ',',
                    orientation, end, ',', end_y]
                    .join(' ');
            })
            .style('fill', 'none')
            .attr('stroke-width', 2.5)
            .attr('stroke', function (d) {
                if (d.sign === '+') {
                    return '#779ecb';
                } else {
                    return '#ff6961';
                }
            });

        // print intra edges
        svg.selectAll('mylinks')
            .data(intra_edges)
            .enter()
            .append('path')
            .attr('d', function (d) {
                start = nodes[d.source].y;
                end = nodes[d.target].y;
                x = nodes[d.source].x;
                sign = d.sign;
                old_x = nodes[d.source].old_x;
                orientation = 0; // switch to invert
                if ((d.sign === '+' && old_x > 0) || (d.sign === '-' && old_x < 0)) {
                    orientation = 1; // switch to invert
                }

                return ['M', x, start, 'A',
                    (start - end), ',',
                    (start - end), 0, 0, ',',
                    orientation, x, ',', end]
                    .join(' ');
            })
            .style('fill', 'none')
            .attr('stroke-width', 2.5)
            .attr('stroke', function (d) {
                if (d.sign === '+') {
                    return '#779ecb';
                } else {
                    return '#ff6961';
                }
            });

        // print the nodes
        svg.selectAll('.node')
            .data(d3.entries(nodes))
            .enter().append('circle')
            .attr('cx', function (d) {
                return d.value.x;
            })
            .attr('cy', function (d) {
                return d.value.y;
            })
            .attr('r', '10')
            .attr('fill', 'black')
            .attr('fill-opacity', '0.4');
    });
}

// ready of the window
$(document).ready(function () {
    // file chooser
    $('#customFile').on('change', function () {
        var fileName = $(this).val();
        $('.custom-file-label').html(fileName);
    });

    // event listener of the show button
    $('#btnDisplay').on('click', function () {
        var file = document.getElementById('customFile').files[0];

        var reader = new FileReader();
        reader.onload = function (event) {
            var testo = event.target.result;
            var dtype = $('#decompositionType').val();
            display_graph(testo, dtype);
        };
        reader.readAsText(file);
    });

    // event listener of the download button
    $('#btnExport').on('click', function () {
        var svg = $('main').find('svg')[0];
        var name = 'plot.png';
        saveSvgAsPng(svg, name, { scale: 2.5, backgroundColor: '#FFFFFF' });
    });
});
