function ClusteringResult(canvas, data, screen_width, screen_height){
	var _self = this;
	_self.canvas = canvas;
	_self.data = data;
	_self.margin = 40;
	_self.rect_size = 15;

	_self.parameters = ["n_clusters"];
	_self.quality_metrics = _.without(Object.keys(_self.data[0]["quality_metrics"]), "silhouette_clusters","silhouette_samples", "separation_clusters", "cohesion_clusters","min_max_dist");
	_self.radius = 7.5;
	_self.num_params = _self.parameters.length + _self.quality_metrics.length;

	screen_height = (_self.rect_size*(_self.num_params+2))*(_self.data.length+1);
	_self.width = screen_width-2*_self.margin;
	_self.height = screen_height-2*_self.margin;

	//  Context Menu
    _self.context_menu = [
        {
            title: 'Choose it as a seeder',
            action: function(elm, d, i) {
            	console.log(elm);
            	console.log(d);
                console.log(i);
            },
            disabled: false
        }
    ];

	d3.select(canvas).selectAll("svg").remove();

	_self.svg = d3.select(canvas).append("svg")
				.attr("width", screen_width)
				.attr("height", screen_height)
				.style("display", "block")
				.style("margin", "auto")
			.append("g")
				.attr("transform", "translate("+_self.margin+","+_self.margin+")");

	_self.list_space = _self.svg.selectAll("g.list_space")
							.data(_self.data).enter()
						.append("g")
							.attr("class", "list_space")
							.attr("transform", function(d,i){
								var x = 0;
								var y = i*_self.rect_size*(_self.num_params+2);
								return "translate("+x+","+y+")";
							})
							.style("cursor", "pointer")
							.on("click", function(d,i){
								d3.selectAll(".clustering").style("stroke", "black");
								d3.select(this).selectAll(".clustering").style("stroke", "orange");
								_s.listenerMap['quality_chart_listener_for_cluster_list'].fire([d,i]);
								_s.listenerMap['quality_chart_listener_for_embedding'].fire([d,i]);
							})
							.on("contextmenu", d3.contextMenu(_self.context_menu));


	_self.rect = _self.list_space.append("rect")
					.attr("class", "clustering")
					.attr("width", _self.width)
					.attr("height", _self.rect_size*(_self.num_params+.5))
					.attr("x", -_self.rect_size)
					.attr("y", -_self.rect_size)
					.style("fill", "none")
					.style("stroke", "black")
					.style("stroke-width", "2.5px")
					.style("cursor", "pointer")
					// .on("click", function(d,i){
					// 	_s.listenerMap['quality_chart_listener_for_cluster_list'].fire([d,i]);
					// 	_s.listenerMap['quality_chart_listener_for_embedding'].fire([d,i]);
					// });

	_self.circ_g = _self.list_space.append("g")
					.attr("transform", "translate("+(-_self.rect_size)+","+(-_self.rect_size)+")");

	_self.circ = _self.circ_g.append("circle")
					.attr("class", "clustering")
					.attr("r", _self.rect_size*.75)
					.style("fill", "white")
					.style("stroke", "black")
					.style("stroke-width", "2.5px")
					.style("cursor", "pointer")
					// .on("click", function(d,i){
					// 	_s.listenerMap['quality_chart_listener_for_cluster_list'].fire([d,i]);
					// 	_s.listenerMap['quality_chart_listener_for_embedding'].fire([d,i]);
					// });


	_self.circ_label = _self.circ_g.append("text")
						.style("text-anchor", "middle")
			            .style("font-size", "100%")
			            .style("alignment-baseline", "central")
						.text(function(d,i){return i;});

	_self.list_desc = _self.list_space.selectAll("g.list_desc")
							.data(function(d){
								var array = _self.parameters.map(function(e){
									var value = 0;
									if(isInt(d[e])){
										value = d[e];
									}else if(isFloat(d[e])){
										value = parseFloat(d[e]).toFixed(3);
									}
									return {"name": e, "value": value};});
								array = array.concat(_self.quality_metrics.map(function(e){
									var value = 0;
									if(isInt(d["quality_metrics"][e])){
										value = d["quality_metrics"][e];
									}else if(isFloat(d["quality_metrics"][e])){
										value = parseFloat(d["quality_metrics"][e]).toFixed(3);
									}
									return {"name":e, "value":value};}));
								return array;
							}).enter()
						.append("g").attr("class", "list_desc")
							.attr("transform", function(d,i){
								var x = 0;
								var y = i*_self.rect_size;
								return "translate("+x+","+y+")";
							});

	_self.list_text = _self.list_desc.append("text")
							.style("font-size", "75%")
							.text(function(d){return d["name"] + ": " + d["value"];});


	_self.rect = _self.list_space.append("rect")
					.attr("width", (_self.width+_self.rect_size))
					.attr("height", (_self.rect_size*(_self.num_params+.5)+_self.rect_size))
					.attr("x", -_self.rect_size*2)
					.attr("y", -_self.rect_size*2)
					.style("opacity", 0)
					.style("fill", "black")
					.style("stroke", "black")
					.style("cursor", "pointer")
					// .on("click", function(d,i){
					// 	_s.listenerMap['quality_chart_listener_for_cluster_list'].fire([d,i]);
					// 	_s.listenerMap['quality_chart_listener_for_embedding'].fire([d,i]);
					// });

}

function isInt(n){
	var n = parseFloat(n);
    return Number(n) === n && n % 1 === 0;
}

function isFloat(n){
	var n = parseFloat(n);
    return Number(n) === n && n % 1 !== 0;
}
