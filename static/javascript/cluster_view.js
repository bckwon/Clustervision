function ClusterView(canvas, data, screen_width, screen_height){
	var _self = this;
	_self.canvas = canvas;
	_self.data = data;
	_self.margin = 20;
	_self.rect_size = 20;
	_self.width = screen_width-2*_self.margin;
	_self.height = screen_height-2*_self.margin;
	_self.parameters = ["n_clusters", "quality"];

	d3.select(canvas).selectAll("*").remove();

	_self.svg = d3.select(canvas).append("svg")
				.attr("width", screen_width)
				.attr("height", screen_height)
			.append("g")
				.attr("transform", "translate("+_self.margin+","+_self.margin+")");

	_self.column = _self.svg.selectAll("g.column")
				.data(_self.data).enter()
					.append("g")
					.attr("class", "column")
					.attr("transform", function(d,i){
						var x = _self.rect_size*i*2;
						var y = _self.rect_size;
						return "translate("+x+","+y+")";
					});

	_self.parameter_view = _self.column.selectAll("g.parameter")
							.data(function(d){
								var array = [];
								_self.parameters.forEach(function(e){
									array.push(d[e]);
								})
								return array;}).enter()
						.append("g")
							.attr("class", "parameter")
							.attr("transform", function(d,i){
								return "translate(0,"+i*_self.rect_size/2+")";
							});

	_self.parameter_text = _self.parameter_view.append("text")
								.text(function(d,i){
									if(i==1){
										return d.toFixed(2);
									}
									return d;})
								.style("font-size", "80%");

	_self.label_view = _self.column.selectAll("g.label")
							.data(function(d){
								return d["labels"];
							}).enter()
						.append("g")
							.attr("class", "label")
							.attr("transform", function(d,i){
								return "translate(0,"+(i+3)*_self.rect_size/2+")";
							});

	_self.label_text = _self.label_view.append("text")
							.text(function(d){return d;})
							.style("font-size", "80%");

}