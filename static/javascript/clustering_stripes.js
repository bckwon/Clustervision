function ClusteringStripes(canvas, data, screen_width, screen_height){
	var _self = this;
	_self.canvas = canvas;
	_self.data = data;
	_self.margin = 60;
	_self.rect_size = 30;

	_self.parameters = ["n_clusters", "alg_name"];
	_self.quality_metrics = _.without(Object.keys(_self.data[0]["quality_metrics"]), "silhouette_samples", "separation_clusters", "cohesion_clusters", "min_max_dist");
	_self.radius = 7.5;
	_self.buffer_coeff = 1.25;
	_self.num_params = _self.parameters.length + _self.quality_metrics.length;
	if((_self.rect_size*_self.buffer_coeff)*(_self.data.length+1) +_self.margin*2 < screen_height){

	}else{
		screen_height = (_self.rect_size*_self.buffer_coeff)*(_self.data.length+1) +_self.margin*2;
	}
	_self.width = screen_width-2*_self.margin;
	_self.height = screen_height-2*_self.margin;

	var max_domain = [];
	_self.data.forEach(function(cres){
		var domain = _.uniq(cres["labels"]);
		if(domain.length >= max_domain){
			max_domain = domain.sort();
		}
	})
	_self.color = d3.scale.ordinal()
    .range(COLOR_RANGE.slice()).domain(max_domain);

	_self.cluster_rect_scale = d3.scale.linear().range([0, _self.width]).domain([0, _self.data[0]["labels"].length]);

	_self.asterplots = [];

	d3.select(canvas).selectAll("svg").remove();

	_self.svg = d3.select(canvas).append("svg")
				.attr("width", screen_width)
				.attr("height", screen_height)
				.style("display", "block")
				.style("margin", "auto")
			.append("g")
				.attr("transform", "translate("+_self.margin+","+_self.margin+")");

		//  Context Menu
    _self.context_menu = [
        {
            title: 'Choose it as a seeder',
            action: function(elm, d, i) {
            	window.chosen_user_choice = i;
            	d3.selectAll("rect.user_choice").remove();
            	d3.select(elm).append("rect")
            		.attr("class", "user_choice")
            		.attr("x", -_self.rect_size*1.5)
            		.attr("width",_self.width+_self.rect_size*3.5)
            		.attr("height",_self.rect_size)
            		.style("fill", "none")
            		.style("stroke", "#e34a33")
            		.style("stroke-width", 2.5);
            },
            disabled: false
        }
    ];


	_self.list_space = _self.svg.selectAll("g.list_space")
							.data(_self.data).enter()
						.append("g")
							.attr("class", "list_space")
							.attr("transform", function(d,i){
								var x = 0;
								var y = i*_self.rect_size*_self.buffer_coeff;
								return "translate("+x+","+y+")";
							})
							.style("cursor", "pointer")
							.on("click", function(d,i){
								d3.selectAll(".clustering_container").style("stroke", "black");
								d3.select(this).selectAll(".clustering_container").style("stroke", "orange");
								_s.listenerMap['quality_chart_listener_for_cluster_list'].fire([d,i]);
								_s.listenerMap['quality_chart_listener_for_embedding'].fire([d,i]);
								_s.listenerMap['quality_chart_listener_for_parallel_coordinates'].fire([d,i]);
								_s.listenerMap['quality_chart_listener_for_updating_list_table'].fire(i);
								_self.asterplots.forEach(function(ap,j){
									if(i == j){
										ap.highlight_circles(true);
									}else{
										ap.highlight_circles(false);
									}
								})
							})
							.on("mouseenter", function(d,i){
								_self.popup(i);
							})
							.on("mouseleave", function(d,i){
								d3.selectAll(".pop").remove();
							})
							.on("contextmenu", d3.contextMenu(_self.context_menu));


	_self.rect = _self.list_space.append("rect")
					.attr("class", "clustering_container")
					.attr("width", _self.width)
					.attr("height", _self.rect_size)
					.style("fill", "none")
					.style("stroke", "black")
					.style("stroke-width", "2.5px")
					.style("cursor", "pointer")

	_self.cluster_rect = _self.list_space.selectAll("rect.cluster_rect")
							.data(function(d,i){
								// x: x_position
								// size: rect_size
								// array: sorted_labels
								var array = [];
								array = d["sorted_labels"].map(function(e,j){
									var obj = {};
									if(j == 0){
										obj["x"] = 0;
									}else{
										obj["x"] = d3.sum(d["sorted_labels"].slice(0,j).map(function(f){return f.length;}));
									}
									obj["size"] = e.length;
									obj["array"] = e;
									return obj;
								})
								return array;
							}).enter()
						.append("rect")
							.attr("class", "cluster_rect")
							.attr("x", function(d,i){
								return _self.cluster_rect_scale(d["x"]);
							})
							.attr("height", _self.rect_size)
							.attr("width", function(d){
								return _self.cluster_rect_scale(d["size"]);
							})
							.style("fill", function(d,i){
								return _self.color(i);
							});


	_self.circ_g = _self.list_space.append("g")
					.attr("transform", "translate("+(-_self.rect_size)+","+(_self.rect_size/2)+ ")");

	_self.circ = _self.circ_g.append("circle")
					.attr("class", "clustering_container")
					.attr("r", _self.radius)
					.style("fill", "white")
					.style("stroke", "black")
					.style("stroke-width", "2.5px")
					.style("cursor", "pointer")


	_self.circ_label = _self.circ_g.append("text")
					.style("text-anchor", "middle")
		            .style("font-size", "100%")
		            .style("alignment-baseline", "central")
					.text(function(d,i){return i;});

	_self.aster_g = _self.list_space.append("g")
					.attr("class", function(d,i){
						return "aster_g_"+i;
					})
					.attr("transform", "translate("+(_self.width+_self.rect_size/2)+",0)");

	_self.extent = [];
	_self.quality_metrics.forEach(function(d){
		_self.extent.push(d3.extent(_self.data, function(e){
			return parseFloat(e["quality_metrics"][d]);
		}));
	});


	_self.aster = _self.aster_g.each(function(d,i){
						var obj = {};
						_self.quality_metrics.forEach(function(e){
							obj[e] = parseFloat(d["quality_metrics"][e]).toFixed(3);
						});
						var keys = Object.keys(obj);
						var classname = "." + d3.select(this).attr("class");
						_self.asterplots.push(new Aster(classname, _self.rect_size, _self.rect_size, obj, keys, _self.extent));
					});

}

ClusteringStripes.prototype.popup = function(list_index){
    var _self = this;
    d3.selectAll(".pop").remove();

    var width = Math.ceil(_self.width*(.8)) - _self.margin*2;
    var height = (_self.rect_size*(_self.num_params+2))*(_self.data.length+1);

    var gsp_pop = _self.svg.append("g")
                .attr("class", "pop")
               .attr("transform", "translate(0," + (_self.margin+list_index*_self.rect_size*_self.buffer_coeff)+")");

    var pop_space = gsp_pop.selectAll("g.pop_space")
							.data([_self.data[list_index]]).enter()
						.append("g")
							.attr("class", "pop_space")
							.attr("transform", function(d,i){
								var x = _self.rect_size;
								var y = i*_self.rect_size*(_self.num_params+1);
								return "translate("+x+","+y+")";
							})
							.style("cursor", "pointer");

	var pop_rect = pop_space.append("rect")
					.attr("class", "clustering")
					.attr("width", _self.width)
					.attr("height", _self.rect_size*(_self.num_params+.5))
					.attr("x", -_self.rect_size)
					.attr("y", -_self.rect_size)
					.style("fill", "white")
					.style("stroke", "black")
					.style("stroke-width", "2.5px")
					.style("cursor", "pointer");

	// var circle_space = pop_space.append("g")
	// 				.attr("transform", "translate("+(-_self.rect_size)+","+(-_self.rect_size)+")");

	// var circle = circle_space.append("circle")
	// 				.attr("class", "clustering")
	// 				.attr("r", _self.rect_size*.75)
	// 				.style("fill", "white")
	// 				.style("stroke", "black")
	// 				.style("stroke-width", "2.5px")
	// 				.style("cursor", "pointer");

	// var circle_label = circle_space.append("text")
	// 					.style("text-anchor", "middle")
	// 		            .style("font-size", "100%")
	// 		            .style("alignment-baseline", "central")
	// 					.text(function(d,i){return i;});

	var list_desc = pop_space.selectAll("g.list_desc")
							.data(function(d){
								var cluster_param = d;

								var array = _self.parameters.map(function(e){

									var value = 0;
									if(isInt(d[e])){
										value = d[e];
									} else if(isFloat(d[e])){
										value = parseFloat(d[e]).toFixed(3);
									} else { // else a string parameter (like alg_name)
										return {"name": e, "value": d.clustering_parameters[e]};
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

	var list_text = list_desc.append("text")
							.attr("dx", -_self.rect_size/2)
							.style("font-size", "100%")
							.text(function(d){return d["name"] + ": " + d["value"];});

	// var rect = list_desc.append("rect")
	// 				.attr("width", (_self.width+_self.rect_size))
	// 				.attr("height", (_self.rect_size*(_self.num_params+.5)+_self.rect_size))
	// 				.attr("x", -_self.rect_size*2)
	// 				.attr("y", -_self.rect_size*2)
	// 				.style("opacity", 0)
	// 				.style("fill", "black")
	// 				.style("stroke", "black")
	// 				.style("cursor", "pointer")

  }
