/**
 *
 * @author Bum Chul Kwon <bumchul.kwon@us.ibm.com>
 * Twitter, Github: @bckwon
 * Website: https://bckwon.com
 *
 */
function QualityChart(canvas, data, screen_width, screen_height){
	var _self = this;
	_self.canvas = canvas;
	_self.data = data;
	_self.margin = 40;
	_self.rect_size = 20;
	_self.width = screen_width-2*_self.margin;
	_self.height = screen_height-2*_self.margin;
	_self.parameters = ["n_clusters", "quality"];
	_self.radius = 10;

	d3.select(canvas).selectAll("*").remove();

	_self.x = d3.scale.ordinal()
        .rangePoints([0, _self.width]);
	_self.y = d3.scale.linear()
        .range([_self.height, 0]);
    _self.x.domain(_self.data.map(function(d,i){return i;}));
    _self.y.domain([-1, 1]);

	_self.svg = d3.select(canvas).append("svg")
				.attr("width", screen_width)
				.attr("height", screen_height)
				.style("display", "block")
				.style("margin", "auto")
			.append("g")
				.attr("transform", "translate("+_self.margin+","+_self.margin+")");

	_self.xAxis_space = _self.svg
				      .append("g")
				        .attr("class", "x axis")
				        .attr("transform", "translate(0," + _self.height + ")")
				        .call(d3.svg.axis().scale(_self.x).orient("bottom"))
				        .selectAll("text")
				            .style("text-anchor", "middle")
				            .style("font-size", "80%")
				            .style("alignment-baseline", "central")
				            .attr("dx", "-.8em")
				            .attr("dy", ".15em");

	_self.yAxis_space = _self.svg
				      .append("g")
				        .attr("class", "y axis")
				        .attr("transform", "translate(0,0)")
				        .call(d3.svg.axis().scale(_self.y).orient("left").ticks(3))
				        .selectAll("text")
				        	.style("font-size", "80%")
				            .style("text-anchor", "end")
				            .style("alignment-baseline", "central")
				            .attr("dx", "-.8em")
				            .attr("dy", ".15em");

	_self.zero_line = _self.svg.append("line")
						.attr("x1", _self.x(_self.x.domain()[0]))
						.attr("x2", _self.x(_self.x.domain()[_self.x.domain().length-1]))
						.attr("y1", _self.y(0))
						.attr("y2", _self.y(0))
						.style("fill", "none")
						.style("stroke", "black")
						.style("stroke-dasharray", "2,2");

	_self.circle_g = _self.svg.selectAll("g.circle")
				.data(_self.data).enter()
					.append("g")
					.attr("class", "circle_g")
					.attr("transform", function(d,i){
						var x = _self.x(i);
						var y = _self.y(d[_self.parameters[1]]);
						return "translate("+x+","+y+")";
					})
					.on("click", function(d,i){
						d3.selectAll(".clustering_circle").style("stroke", "none").style("stroke-width", 1);
						d3.select(this).select("circle").style("stroke", "black").style("stroke-width", 5);
						console.log(d);
						_s.listenerMap['quality_chart_listener_for_cluster_list'].fire([d,i]);
						_s.listenerMap['quality_chart_listener_for_embedding'].fire([d,i]);
					});

	_self.circle = _self.circle_g.append("circle")
					.attr("class", "clustering_circle")
					.attr("r", _self.radius)
					.style("cursor", "pointer")
					.style("fill", "steelblue");

	_self.circle_text = _self.circle_g.append("text")
							.style("text-anchor", "middle")
							.style("alignment-baseline", "central")
							.style("fill", "black")
							.style("cursor", "pointer")
							.text(function(d){
								return d[_self.parameters[0]];
							})

}