function average(data){
	elementOpen('div');
		text('Init rendering: '+ data.init +'ms;');
	elementClose('div');
	elementOpen('div');
		text('count of updates: '+ data.count +', update DOM average time: '+ data.duration/data.count +'ms;');
	elementClose('div');
}
function table(data){
	for (var i = 0; i < length; i++) { 
	elementOpen('div', null, null, 'class', 'cell', 'style', 'background-color: '+ data[i].color +';');
		elementOpen('span');
			text( data[i].data );
		elementClose('span');
	elementClose('div');
	}
}