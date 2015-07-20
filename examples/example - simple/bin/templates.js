function template(data){
	elementOpen('h2');
		text( data.listTitle );
	elementClose('h2');
	elementOpen('ul');
		_.each( data.listItems, function(listItem, i){     
		elementOpen('li', null, null, 'class', 'row '+(i % 2 == 1 ? ' even' : ''));
			text( listItem.name );
			if (listItem.hasOlympicGold){         
			elementOpen('em');
				text('*');
			elementClose('em');
			}     
		elementClose('li');     
		}); 
	elementClose('ul');  
	var showFootnote = _.any( _.pluck( data.listItems, "hasOlympicGold" ) );  
	if ( showFootnote ){ 
	elementOpen('p', null, null, 'style', 'font-size: 12px ;');
		elementOpen('em');
			text('* Olympic gold medalist');
		elementClose('em');
	elementClose('p');
	}
}