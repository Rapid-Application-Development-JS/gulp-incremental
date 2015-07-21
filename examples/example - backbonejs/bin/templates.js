function template(data){
	elementOpen('div');
		text('Clicks:'+ data );
	elementClose('div');
	elementOpen('button', null, null, 'class', 'button edit');
		text('Click');
	elementClose('button');
}