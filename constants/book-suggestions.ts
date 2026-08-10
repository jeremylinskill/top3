export type BookSuggestion = {
  title: string;
  search: string;
};

export const BOOK_SUGGESTIONS: Record<
  string,
  BookSuggestion[]
> = {
  'biography': [
    {
      title: 'Steve Jobs',
      search: 'Steve Jobs Walter Isaacson',
    },
    {
      title: 'Becoming',
      search: 'Becoming Michelle Obama',
    },
    {
      title: 'Educated',
      search: 'Educated Tara Westover',
    },
    {
      title: 'Shoe Dog',
      search: 'Shoe Dog Phil Knight',
    },
    {
      title: 'The Diary of a Young Girl',
      search: 'The Diary of a Young Girl Anne Frank',
    },
    {
      title: 'Into the Wild',
      search: 'Into the Wild Jon Krakauer',
    },
    {
      title: 'The Glass Castle',
      search: 'The Glass Castle Jeannette Walls',
    },
    {
      title: 'Born a Crime',
      search: 'Born a Crime Trevor Noah',
    },
    {
      title: 'Greenlights',
      search: 'Greenlights Matthew McConaughey',
    },
    {
      title: 'Long Walk to Freedom',
      search: 'Long Walk to Freedom Nelson Mandela',
    },
    {
      title: 'When Breath Becomes Air',
      search: 'When Breath Becomes Air Paul Kalanithi',
    },
    {
      title: 'I Am Malala',
      search: 'I Am Malala Malala Yousafzai',
    },
    {
      title: 'The Wright Brothers',
      search: 'The Wright Brothers David McCullough',
    },
    {
      title: 'Einstein',
      search: 'Einstein Walter Isaacson',
    },
    {
      title: 'Churchill',
      search: 'Churchill Roy Jenkins',
    },
    {
      title: 'Open',
      search: 'Open Andre Agassi',
    },
    {
      title: 'Scar Tissue',
      search: 'Scar Tissue Anthony Kiedis',
    },
    {
      title: 'Kitchen Confidential',
      search: 'Kitchen Confidential Anthony Bourdain',
    },
    {
      title: 'Just Kids',
      search: 'Just Kids Patti Smith',
    },
    {
      title: 'Unbroken',
      search: 'Unbroken Laura Hillenbrand',
    },
    {
      title: 'Can\'t Hurt Me',
      search: 'Can\'t Hurt Me David Goggins',
    },
    {
      title: 'The Boys in the Boat',
      search: 'The Boys in the Boat Daniel James Brown',
    },
    {
      title: 'Elon Musk',
      search: 'Elon Musk Walter Isaacson',
    },
    {
      title: 'Leonardo da Vinci',
      search: 'Leonardo da Vinci Walter Isaacson',
    },
    {
      title: 'Alexander Hamilton',
      search: 'Alexander Hamilton Ron Chernow',
    },
    {
      title: 'The Ride of a Lifetime',
      search: 'The Ride of a Lifetime Robert Iger',
    },
    {
      title: 'American Prometheus',
      search: 'American Prometheus Kai Bird Martin Sherwin',
    },
    {
      title: 'The Last Lecture',
      search: 'The Last Lecture Randy Pausch',
    },
    {
      title: 'Finding Me',
      search: 'Finding Me Viola Davis',
    },
    {
      title: 'Spare',
      search: 'Spare Prince Harry',
    },
    {
      title: 'Wild',
      search: 'Wild Cheryl Strayed',
    },
    {
      title: 'Hillbilly Elegy',
      search: 'Hillbilly Elegy J D Vance',
    },
    {
      title: 'Permanent Record',
      search: 'Permanent Record Edward Snowden',
    },
    {
      title: 'On Writing',
      search: 'On Writing Stephen King',
    },
    {
      title: 'Benjamin Franklin',
      search: 'Benjamin Franklin Walter Isaacson',
    },
    {
      title: 'My Life',
      search: 'My Life Bill Clinton',
    },
    {
      title: 'Total Recall',
      search: 'Total Recall Arnold Schwarzenegger',
    },
    {
      title: 'The Storyteller',
      search: 'The Storyteller Dave Grohl',
    },
    {
      title: 'Know My Name',
      search: 'Know My Name Chanel Miller',
    },
    {
      title: 'Just Mercy',
      search: 'Just Mercy Bryan Stevenson',
    },
  ],
  'business': [
    {
      title: 'Good to Great',
      search: 'Good to Great Jim Collins',
    },
    {
      title: 'Built to Last',
      search: 'Built to Last Jim Collins Jerry Porras',
    },
    {
      title: 'Zero to One',
      search: 'Zero to One Peter Thiel',
    },
    {
      title: 'The Lean Startup',
      search: 'The Lean Startup Eric Ries',
    },
    {
      title: 'Blue Ocean Strategy',
      search: 'Blue Ocean Strategy W Chan Kim Renee Mauborgne',
    },
    {
      title: 'Atomic Habits',
      search: 'Atomic Habits James Clear',
    },
    {
      title: 'The 7 Habits of Highly Effective People',
      search: 'The 7 Habits of Highly Effective People Stephen Covey',
    },
    {
      title: 'Start With Why',
      search: 'Start With Why Simon Sinek',
    },
    {
      title: 'Thinking, Fast and Slow',
      search: 'Thinking Fast and Slow Daniel Kahneman',
    },
    {
      title: 'The Innovator\'s Dilemma',
      search: 'The Innovator\'s Dilemma Clayton Christensen',
    },
    {
      title: 'The Hard Thing About Hard Things',
      search: 'The Hard Thing About Hard Things Ben Horowitz',
    },
    {
      title: 'Measure What Matters',
      search: 'Measure What Matters John Doerr',
    },
    {
      title: 'Crossing the Chasm',
      search: 'Crossing the Chasm Geoffrey Moore',
    },
    {
      title: 'Rework',
      search: 'Rework Jason Fried David Heinemeier Hansson',
    },
    {
      title: 'Hooked',
      search: 'Hooked Nir Eyal',
    },
    {
      title: 'The Mom Test',
      search: 'The Mom Test Rob Fitzpatrick',
    },
    {
      title: 'Principles',
      search: 'Principles Ray Dalio',
    },
    {
      title: 'Never Split the Difference',
      search: 'Never Split the Difference Chris Voss',
    },
    {
      title: 'Influence',
      search: 'Influence Robert Cialdini',
    },
    {
      title: 'Essentialism',
      search: 'Essentialism Greg McKeown',
    },
    {
      title: 'Deep Work',
      search: 'Deep Work Cal Newport',
    },
    {
      title: 'The Psychology of Money',
      search: 'The Psychology of Money Morgan Housel',
    },
    {
      title: 'Shoe Dog',
      search: 'Shoe Dog Phil Knight',
    },
    {
      title: 'Purple Cow',
      search: 'Purple Cow Seth Godin',
    },
    {
      title: 'The Design of Everyday Things',
      search: 'The Design of Everyday Things Don Norman',
    },
    {
      title: 'Creativity, Inc.',
      search: 'Creativity Inc Ed Catmull',
    },
    {
      title: 'The E-Myth Revisited',
      search: 'The E Myth Revisited Michael Gerber',
    },
    {
      title: 'Built to Sell',
      search: 'Built to Sell John Warrillow',
    },
    {
      title: 'The Personal MBA',
      search: 'The Personal MBA Josh Kaufman',
    },
    {
      title: 'Made to Stick',
      search: 'Made to Stick Chip Heath Dan Heath',
    },
    {
      title: 'Contagious',
      search: 'Contagious Jonah Berger',
    },
    {
      title: 'The Almanack of Naval Ravikant',
      search: 'The Almanack of Naval Ravikant Eric Jorgenson',
    },
    {
      title: 'High Output Management',
      search: 'High Output Management Andrew Grove',
    },
    {
      title: 'Radical Candor',
      search: 'Radical Candor Kim Scott',
    },
    {
      title: 'Team of Teams',
      search: 'Team of Teams Stanley McChrystal',
    },
    {
      title: 'Extreme Ownership',
      search: 'Extreme Ownership Jocko Willink Leif Babin',
    },
    {
      title: 'Originals',
      search: 'Originals Adam Grant',
    },
    {
      title: 'Range',
      search: 'Range David Epstein',
    },
    {
      title: 'The Goal',
      search: 'The Goal Eliyahu Goldratt',
    },
    {
      title: 'Good Strategy Bad Strategy',
      search: 'Good Strategy Bad Strategy Richard Rumelt',
    },
  ],
  'childrens': [
    {
      title: 'Charlotte\'s Web',
      search: 'Charlotte\'s Web E B White',
    },
    {
      title: 'The Very Hungry Caterpillar',
      search: 'The Very Hungry Caterpillar Eric Carle',
    },
    {
      title: 'Where the Wild Things Are',
      search: 'Where the Wild Things Are Maurice Sendak',
    },
    {
      title: 'Goodnight Moon',
      search: 'Goodnight Moon Margaret Wise Brown',
    },
    {
      title: 'The Gruffalo',
      search: 'The Gruffalo Julia Donaldson',
    },
    {
      title: 'Matilda',
      search: 'Matilda Roald Dahl',
    },
    {
      title: 'The BFG',
      search: 'The BFG Roald Dahl',
    },
    {
      title: 'Charlie and the Chocolate Factory',
      search: 'Charlie and the Chocolate Factory Roald Dahl',
    },
    {
      title: 'The Cat in the Hat',
      search: 'The Cat in the Hat Dr Seuss',
    },
    {
      title: 'Green Eggs and Ham',
      search: 'Green Eggs and Ham Dr Seuss',
    },
    {
      title: 'The Giving Tree',
      search: 'The Giving Tree Shel Silverstein',
    },
    {
      title: 'The Polar Express',
      search: 'The Polar Express Chris Van Allsburg',
    },
    {
      title: 'Winnie-the-Pooh',
      search: 'Winnie the Pooh A A Milne',
    },
    {
      title: 'Harry Potter and the Philosopher\'s Stone',
      search: 'Harry Potter and the Philosopher\'s Stone J K Rowling',
    },
    {
      title: 'The Lion, the Witch and the Wardrobe',
      search: 'The Lion the Witch and the Wardrobe C S Lewis',
    },
    {
      title: 'Holes',
      search: 'Holes Louis Sachar',
    },
    {
      title: 'Wonder',
      search: 'Wonder R J Palacio',
    },
    {
      title: 'The Tale of Peter Rabbit',
      search: 'The Tale of Peter Rabbit Beatrix Potter',
    },
    {
      title: 'The Secret Garden',
      search: 'The Secret Garden Frances Hodgson Burnett',
    },
    {
      title: 'Anne of Green Gables',
      search: 'Anne of Green Gables L M Montgomery',
    },
    {
      title: 'The Phantom Tollbooth',
      search: 'The Phantom Tollbooth Norton Juster',
    },
    {
      title: 'Bridge to Terabithia',
      search: 'Bridge to Terabithia Katherine Paterson',
    },
    {
      title: 'The Lightning Thief',
      search: 'The Lightning Thief Rick Riordan',
    },
    {
      title: 'The Hobbit',
      search: 'The Hobbit J R R Tolkien',
    },
    {
      title: 'Inkheart',
      search: 'Inkheart Cornelia Funke',
    },
    {
      title: 'How to Train Your Dragon',
      search: 'How to Train Your Dragon Cressida Cowell',
    },
    {
      title: 'Diary of a Wimpy Kid',
      search: 'Diary of a Wimpy Kid Jeff Kinney',
    },
    {
      title: 'Dog Man',
      search: 'Dog Man Dav Pilkey',
    },
    {
      title: 'The One and Only Ivan',
      search: 'The One and Only Ivan Katherine Applegate',
    },
    {
      title: 'Because of Winn-Dixie',
      search: 'Because of Winn Dixie Kate DiCamillo',
    },
    {
      title: 'Coraline',
      search: 'Coraline Neil Gaiman',
    },
    {
      title: 'A Wrinkle in Time',
      search: 'A Wrinkle in Time Madeleine L Engle',
    },
    {
      title: 'Stuart Little',
      search: 'Stuart Little E B White',
    },
    {
      title: 'The Little Prince',
      search: 'The Little Prince Antoine de Saint Exupery',
    },
    {
      title: 'Pippi Longstocking',
      search: 'Pippi Longstocking Astrid Lindgren',
    },
    {
      title: 'Tuck Everlasting',
      search: 'Tuck Everlasting Natalie Babbitt',
    },
    {
      title: 'The Giver',
      search: 'The Giver Lois Lowry',
    },
    {
      title: 'Hatchet',
      search: 'Hatchet Gary Paulsen',
    },
    {
      title: 'The Wild Robot',
      search: 'The Wild Robot Peter Brown',
    },
    {
      title: 'The Miraculous Journey of Edward Tulane',
      search: 'The Miraculous Journey of Edward Tulane Kate DiCamillo',
    },
  ],
  'fantasy': [
    {
      title: 'The Hobbit',
      search: 'The Hobbit J R R Tolkien',
    },
    {
      title: 'The Fellowship of the Ring',
      search: 'The Fellowship of the Ring J R R Tolkien',
    },
    {
      title: 'Harry Potter and the Philosopher\'s Stone',
      search: 'Harry Potter and the Philosopher\'s Stone J K Rowling',
    },
    {
      title: 'A Game of Thrones',
      search: 'A Game of Thrones George R R Martin',
    },
    {
      title: 'The Name of the Wind',
      search: 'The Name of the Wind Patrick Rothfuss',
    },
    {
      title: 'Mistborn',
      search: 'Mistborn Brandon Sanderson',
    },
    {
      title: 'The Way of Kings',
      search: 'The Way of Kings Brandon Sanderson',
    },
    {
      title: 'The Lies of Locke Lamora',
      search: 'The Lies of Locke Lamora Scott Lynch',
    },
    {
      title: 'American Gods',
      search: 'American Gods Neil Gaiman',
    },
    {
      title: 'Jonathan Strange & Mr Norrell',
      search: 'Jonathan Strange and Mr Norrell Susanna Clarke',
    },
    {
      title: 'The Eye of the World',
      search: 'The Eye of the World Robert Jordan',
    },
    {
      title: 'Assassin\'s Apprentice',
      search: 'Assassin\'s Apprentice Robin Hobb',
    },
    {
      title: 'The Blade Itself',
      search: 'The Blade Itself Joe Abercrombie',
    },
    {
      title: 'Good Omens',
      search: 'Good Omens Neil Gaiman Terry Pratchett',
    },
    {
      title: 'Stardust',
      search: 'Stardust Neil Gaiman',
    },
    {
      title: 'The Last Unicorn',
      search: 'The Last Unicorn Peter S Beagle',
    },
    {
      title: 'The Priory of the Orange Tree',
      search: 'The Priory of the Orange Tree Samantha Shannon',
    },
    {
      title: 'The Fifth Season',
      search: 'The Fifth Season N K Jemisin',
    },
    {
      title: 'The Black Prism',
      search: 'The Black Prism Brent Weeks',
    },
    {
      title: 'The Dragonbone Chair',
      search: 'The Dragonbone Chair Tad Williams',
    },
    {
      title: 'Neverwhere',
      search: 'Neverwhere Neil Gaiman',
    },
    {
      title: 'Sabriel',
      search: 'Sabriel Garth Nix',
    },
    {
      title: 'The Poppy War',
      search: 'The Poppy War R F Kuang',
    },
    {
      title: 'Babel',
      search: 'Babel R F Kuang',
    },
    {
      title: 'The Will of the Many',
      search: 'The Will of the Many James Islington',
    },
    {
      title: 'Fourth Wing',
      search: 'Fourth Wing Rebecca Yarros',
    },
    {
      title: 'Iron Flame',
      search: 'Iron Flame Rebecca Yarros',
    },
    {
      title: 'Legends & Lattes',
      search: 'Legends and Lattes Travis Baldree',
    },
    {
      title: 'The House in the Cerulean Sea',
      search: 'The House in the Cerulean Sea TJ Klune',
    },
    {
      title: 'The Colour of Magic',
      search: 'The Colour of Magic Terry Pratchett',
    },
    {
      title: 'Guards! Guards!',
      search: 'Guards Guards Terry Pratchett',
    },
    {
      title: 'Eragon',
      search: 'Eragon Christopher Paolini',
    },
    {
      title: 'The Golden Compass',
      search: 'The Golden Compass Philip Pullman',
    },
    {
      title: 'Tigana',
      search: 'Tigana Guy Gavriel Kay',
    },
    {
      title: 'The Once and Future King',
      search: 'The Once and Future King T H White',
    },
    {
      title: 'The Sword of Shannara',
      search: 'The Sword of Shannara Terry Brooks',
    },
    {
      title: 'Dragonflight',
      search: 'Dragonflight Anne McCaffrey',
    },
    {
      title: 'Elantris',
      search: 'Elantris Brandon Sanderson',
    },
    {
      title: 'The Night Circus',
      search: 'The Night Circus Erin Morgenstern',
    },
    {
      title: 'Piranesi',
      search: 'Piranesi Susanna Clarke',
    },
  ],
  'fiction': [
    {
      title: 'To Kill a Mockingbird',
      search: 'To Kill a Mockingbird Harper Lee',
    },
    {
      title: '1984',
      search: '1984 George Orwell',
    },
    {
      title: 'The Great Gatsby',
      search: 'The Great Gatsby F Scott Fitzgerald',
    },
    {
      title: 'The Catcher in the Rye',
      search: 'The Catcher in the Rye J D Salinger',
    },
    {
      title: 'The Book Thief',
      search: 'The Book Thief Markus Zusak',
    },
    {
      title: 'The Kite Runner',
      search: 'The Kite Runner Khaled Hosseini',
    },
    {
      title: 'A Gentleman in Moscow',
      search: 'A Gentleman in Moscow Amor Towles',
    },
    {
      title: 'Tomorrow, and Tomorrow, and Tomorrow',
      search: 'Tomorrow and Tomorrow and Tomorrow Gabrielle Zevin',
    },
    {
      title: 'All the Light We Cannot See',
      search: 'All the Light We Cannot See Anthony Doerr',
    },
    {
      title: 'The Night Circus',
      search: 'The Night Circus Erin Morgenstern',
    },
    {
      title: 'The Road',
      search: 'The Road Cormac McCarthy',
    },
    {
      title: 'The Goldfinch',
      search: 'The Goldfinch Donna Tartt',
    },
    {
      title: 'The Underground Railroad',
      search: 'The Underground Railroad Colson Whitehead',
    },
    {
      title: 'Cloud Atlas',
      search: 'Cloud Atlas David Mitchell',
    },
    {
      title: 'A Little Life',
      search: 'A Little Life Hanya Yanagihara',
    },
    {
      title: 'The Secret History',
      search: 'The Secret History Donna Tartt',
    },
    {
      title: 'The Midnight Library',
      search: 'The Midnight Library Matt Haig',
    },
    {
      title: 'Lessons in Chemistry',
      search: 'Lessons in Chemistry Bonnie Garmus',
    },
    {
      title: 'Demon Copperhead',
      search: 'Demon Copperhead Barbara Kingsolver',
    },
    {
      title: 'The Lincoln Highway',
      search: 'The Lincoln Highway Amor Towles',
    },
    {
      title: 'Shantaram',
      search: 'Shantaram Gregory David Roberts',
    },
    {
      title: 'Life of Pi',
      search: 'Life of Pi Yann Martel',
    },
    {
      title: 'The Alchemist',
      search: 'The Alchemist Paulo Coelho',
    },
    {
      title: 'The Help',
      search: 'The Help Kathryn Stockett',
    },
    {
      title: 'The Lovely Bones',
      search: 'The Lovely Bones Alice Sebold',
    },
    {
      title: 'The Silent Patient',
      search: 'The Silent Patient Alex Michaelides',
    },
    {
      title: 'The Seven Husbands of Evelyn Hugo',
      search: 'The Seven Husbands of Evelyn Hugo Taylor Jenkins Reid',
    },
    {
      title: 'The Vanishing Half',
      search: 'The Vanishing Half Brit Bennett',
    },
    {
      title: 'The Nightingale',
      search: 'The Nightingale Kristin Hannah',
    },
    {
      title: 'Never Let Me Go',
      search: 'Never Let Me Go Kazuo Ishiguro',
    },
    {
      title: 'The Curious Incident of the Dog in the Night-Time',
      search: 'The Curious Incident of the Dog in the Night Time Mark Haddon',
    },
    {
      title: 'Middlesex',
      search: 'Middlesex Jeffrey Eugenides',
    },
    {
      title: 'Station Eleven',
      search: 'Station Eleven Emily St John Mandel',
    },
    {
      title: 'The Poisonwood Bible',
      search: 'The Poisonwood Bible Barbara Kingsolver',
    },
    {
      title: 'White Teeth',
      search: 'White Teeth Zadie Smith',
    },
    {
      title: 'Pachinko',
      search: 'Pachinko Min Jin Lee',
    },
    {
      title: 'A Fine Balance',
      search: 'A Fine Balance Rohinton Mistry',
    },
    {
      title: 'James',
      search: 'James Percival Everett',
    },
    {
      title: 'Hamnet',
      search: 'Hamnet Maggie O\'Farrell',
    },
    {
      title: 'The Dutch House',
      search: 'The Dutch House Ann Patchett',
    },
  ],
  'history': [
    {
      title: 'Sapiens',
      search: 'Sapiens Yuval Noah Harari',
    },
    {
      title: 'Guns, Germs, and Steel',
      search: 'Guns Germs and Steel Jared Diamond',
    },
    {
      title: 'The Silk Roads',
      search: 'The Silk Roads Peter Frankopan',
    },
    {
      title: 'Team of Rivals',
      search: 'Team of Rivals Doris Kearns Goodwin',
    },
    {
      title: 'The Splendid and the Vile',
      search: 'The Splendid and the Vile Erik Larson',
    },
    {
      title: 'The Rise and Fall of the Third Reich',
      search: 'The Rise and Fall of the Third Reich William Shirer',
    },
    {
      title: 'SPQR',
      search: 'SPQR Mary Beard',
    },
    {
      title: 'Destiny Disrupted',
      search: 'Destiny Disrupted Tamim Ansary',
    },
    {
      title: 'Rubicon',
      search: 'Rubicon Tom Holland',
    },
    {
      title: '1776',
      search: '1776 David McCullough',
    },
    {
      title: 'The Wright Brothers',
      search: 'The Wright Brothers David McCullough',
    },
    {
      title: 'Empire of Pain',
      search: 'Empire of Pain Patrick Radden Keefe',
    },
    {
      title: 'Killers of the Flower Moon',
      search: 'Killers of the Flower Moon David Grann',
    },
    {
      title: 'The Warmth of Other Suns',
      search: 'The Warmth of Other Suns Isabel Wilkerson',
    },
    {
      title: 'Midnight in Chernobyl',
      search: 'Midnight in Chernobyl Adam Higginbotham',
    },
    {
      title: 'Say Nothing',
      search: 'Say Nothing Patrick Radden Keefe',
    },
    {
      title: 'The Wager',
      search: 'The Wager David Grann',
    },
    {
      title: 'The Bomber Mafia',
      search: 'The Bomber Mafia Malcolm Gladwell',
    },
    {
      title: 'Jerusalem',
      search: 'Jerusalem Simon Sebag Montefiore',
    },
    {
      title: 'The Crusades',
      search: 'The Crusades Thomas Asbridge',
    },
    {
      title: 'The Romanovs',
      search: 'The Romanovs Simon Sebag Montefiore',
    },
    {
      title: 'Grant',
      search: 'Grant Ron Chernow',
    },
    {
      title: 'Hiroshima',
      search: 'Hiroshima John Hersey',
    },
    {
      title: 'The Guns of August',
      search: 'The Guns of August Barbara Tuchman',
    },
    {
      title: 'Stalingrad',
      search: 'Stalingrad Antony Beevor',
    },
    {
      title: 'The Second World War',
      search: 'The Second World War Antony Beevor',
    },
    {
      title: 'Bury My Heart at Wounded Knee',
      search: 'Bury My Heart at Wounded Knee Dee Brown',
    },
    {
      title: 'A People\'s History of the United States',
      search: 'A People\'s History of the United States Howard Zinn',
    },
    {
      title: 'Bloodlands',
      search: 'Bloodlands Timothy Snyder',
    },
    {
      title: 'The Black Count',
      search: 'The Black Count Tom Reiss',
    },
    {
      title: 'The British Are Coming',
      search: 'The British Are Coming Rick Atkinson',
    },
    {
      title: 'The Plantagenets',
      search: 'The Plantagenets Dan Jones',
    },
    {
      title: 'Genghis Khan and the Making of the Modern World',
      search: 'Genghis Khan and the Making of the Modern World Jack Weatherford',
    },
    {
      title: 'The Prize',
      search: 'The Prize Daniel Yergin',
    },
    {
      title: 'Napoleon',
      search: 'Napoleon Andrew Roberts',
    },
    {
      title: 'The Cold War',
      search: 'The Cold War John Lewis Gaddis',
    },
    {
      title: 'The Templars',
      search: 'The Templars Dan Jones',
    },
    {
      title: 'The Anarchy',
      search: 'The Anarchy William Dalrymple',
    },
    {
      title: 'The Devil in the White City',
      search: 'The Devil in the White City Erik Larson',
    },
    {
      title: 'The Dawn of Everything',
      search: 'The Dawn of Everything David Graeber David Wengrow',
    },
  ],
  'mystery': [
    {
      title: 'The Girl with the Dragon Tattoo',
      search: 'The Girl with the Dragon Tattoo Stieg Larsson',
    },
    {
      title: 'Gone Girl',
      search: 'Gone Girl Gillian Flynn',
    },
    {
      title: 'Big Little Lies',
      search: 'Big Little Lies Liane Moriarty',
    },
    {
      title: 'The Da Vinci Code',
      search: 'The Da Vinci Code Dan Brown',
    },
    {
      title: 'The Silent Patient',
      search: 'The Silent Patient Alex Michaelides',
    },
    {
      title: 'The Thursday Murder Club',
      search: 'The Thursday Murder Club Richard Osman',
    },
    {
      title: 'The Guest List',
      search: 'The Guest List Lucy Foley',
    },
    {
      title: 'In the Woods',
      search: 'In the Woods Tana French',
    },
    {
      title: 'The Woman in White',
      search: 'The Woman in White Wilkie Collins',
    },
    {
      title: 'The Murder of Roger Ackroyd',
      search: 'The Murder of Roger Ackroyd Agatha Christie',
    },
    {
      title: 'And Then There Were None',
      search: 'And Then There Were None Agatha Christie',
    },
    {
      title: 'Murder on the Orient Express',
      search: 'Murder on the Orient Express Agatha Christie',
    },
    {
      title: 'The Hound of the Baskervilles',
      search: 'The Hound of the Baskervilles Arthur Conan Doyle',
    },
    {
      title: 'The Cuckoo\'s Calling',
      search: 'The Cuckoo\'s Calling Robert Galbraith',
    },
    {
      title: 'The Dry',
      search: 'The Dry Jane Harper',
    },
    {
      title: 'Magpie Murders',
      search: 'Magpie Murders Anthony Horowitz',
    },
    {
      title: 'The Maid',
      search: 'The Maid Nita Prose',
    },
    {
      title: 'The Paris Apartment',
      search: 'The Paris Apartment Lucy Foley',
    },
    {
      title: 'The Last Thing He Told Me',
      search: 'The Last Thing He Told Me Laura Dave',
    },
    {
      title: 'Sharp Objects',
      search: 'Sharp Objects Gillian Flynn',
    },
    {
      title: 'Before I Go to Sleep',
      search: 'Before I Go to Sleep S J Watson',
    },
    {
      title: 'The Snowman',
      search: 'The Snowman Jo Nesbo',
    },
    {
      title: 'The Devotion of Suspect X',
      search: 'The Devotion of Suspect X Keigo Higashino',
    },
    {
      title: 'Still Life',
      search: 'Still Life Louise Penny',
    },
    {
      title: 'The No. 1 Ladies\' Detective Agency',
      search: 'The No 1 Ladies Detective Agency Alexander McCall Smith',
    },
    {
      title: 'The Big Sleep',
      search: 'The Big Sleep Raymond Chandler',
    },
    {
      title: 'The Black Echo',
      search: 'The Black Echo Michael Connelly',
    },
    {
      title: 'Tinker Tailor Soldier Spy',
      search: 'Tinker Tailor Soldier Spy John le Carre',
    },
    {
      title: 'A Study in Scarlet',
      search: 'A Study in Scarlet Arthur Conan Doyle',
    },
    {
      title: 'Death on the Nile',
      search: 'Death on the Nile Agatha Christie',
    },
    {
      title: 'The Hunting Party',
      search: 'The Hunting Party Lucy Foley',
    },
    {
      title: 'Case Histories',
      search: 'Case Histories Kate Atkinson',
    },
    {
      title: 'The Whisper Man',
      search: 'The Whisper Man Alex North',
    },
    {
      title: 'Dark Places',
      search: 'Dark Places Gillian Flynn',
    },
    {
      title: 'I Let You Go',
      search: 'I Let You Go Clare Mackintosh',
    },
    {
      title: 'Everyone in My Family Has Killed Someone',
      search: 'Everyone in My Family Has Killed Someone Benjamin Stevenson',
    },
    {
      title: 'The Appeal',
      search: 'The Appeal Janice Hallett',
    },
    {
      title: 'The Word Is Murder',
      search: 'The Word Is Murder Anthony Horowitz',
    },
    {
      title: 'The Couple Next Door',
      search: 'The Couple Next Door Shari Lapena',
    },
    {
      title: 'The Woman in Cabin 10',
      search: 'The Woman in Cabin 10 Ruth Ware',
    },
  ],
  'non-fiction': [
    {
      title: 'Sapiens',
      search: 'Sapiens Yuval Noah Harari',
    },
    {
      title: 'Thinking, Fast and Slow',
      search: 'Thinking Fast and Slow Daniel Kahneman',
    },
    {
      title: 'Outliers',
      search: 'Outliers Malcolm Gladwell',
    },
    {
      title: 'The Tipping Point',
      search: 'The Tipping Point Malcolm Gladwell',
    },
    {
      title: 'Freakonomics',
      search: 'Freakonomics Steven Levitt Stephen Dubner',
    },
    {
      title: 'The Immortal Life of Henrietta Lacks',
      search: 'The Immortal Life of Henrietta Lacks Rebecca Skloot',
    },
    {
      title: 'Bad Blood',
      search: 'Bad Blood John Carreyrou',
    },
    {
      title: 'Into Thin Air',
      search: 'Into Thin Air Jon Krakauer',
    },
    {
      title: 'Into the Wild',
      search: 'Into the Wild Jon Krakauer',
    },
    {
      title: 'The Sixth Extinction',
      search: 'The Sixth Extinction Elizabeth Kolbert',
    },
    {
      title: 'Quiet',
      search: 'Quiet Susan Cain',
    },
    {
      title: 'Why We Sleep',
      search: 'Why We Sleep Matthew Walker',
    },
    {
      title: 'The Body',
      search: 'The Body Bill Bryson',
    },
    {
      title: 'A Short History of Nearly Everything',
      search: 'A Short History of Nearly Everything Bill Bryson',
    },
    {
      title: 'The Gene',
      search: 'The Gene Siddhartha Mukherjee',
    },
    {
      title: 'The Emperor of All Maladies',
      search: 'The Emperor of All Maladies Siddhartha Mukherjee',
    },
    {
      title: 'Educated',
      search: 'Educated Tara Westover',
    },
    {
      title: 'Evicted',
      search: 'Evicted Matthew Desmond',
    },
    {
      title: 'The New Jim Crow',
      search: 'The New Jim Crow Michelle Alexander',
    },
    {
      title: 'Just Mercy',
      search: 'Just Mercy Bryan Stevenson',
    },
    {
      title: 'The Warmth of Other Suns',
      search: 'The Warmth of Other Suns Isabel Wilkerson',
    },
    {
      title: 'Killers of the Flower Moon',
      search: 'Killers of the Flower Moon David Grann',
    },
    {
      title: 'Empire of Pain',
      search: 'Empire of Pain Patrick Radden Keefe',
    },
    {
      title: 'Say Nothing',
      search: 'Say Nothing Patrick Radden Keefe',
    },
    {
      title: 'The Wager',
      search: 'The Wager David Grann',
    },
    {
      title: 'Braiding Sweetgrass',
      search: 'Braiding Sweetgrass Robin Wall Kimmerer',
    },
    {
      title: 'Entangled Life',
      search: 'Entangled Life Merlin Sheldrake',
    },
    {
      title: 'The Omnivore\'s Dilemma',
      search: 'The Omnivore\'s Dilemma Michael Pollan',
    },
    {
      title: 'Salt, Fat, Acid, Heat',
      search: 'Salt Fat Acid Heat Samin Nosrat',
    },
    {
      title: 'Kitchen Confidential',
      search: 'Kitchen Confidential Anthony Bourdain',
    },
    {
      title: 'The Right Stuff',
      search: 'The Right Stuff Tom Wolfe',
    },
    {
      title: 'The Devil in the White City',
      search: 'The Devil in the White City Erik Larson',
    },
    {
      title: 'The Boys in the Boat',
      search: 'The Boys in the Boat Daniel James Brown',
    },
    {
      title: 'Born a Crime',
      search: 'Born a Crime Trevor Noah',
    },
    {
      title: 'When Breath Becomes Air',
      search: 'When Breath Becomes Air Paul Kalanithi',
    },
    {
      title: 'Man\'s Search for Meaning',
      search: 'Man\'s Search for Meaning Viktor Frankl',
    },
    {
      title: 'The Anthropocene Reviewed',
      search: 'The Anthropocene Reviewed John Green',
    },
    {
      title: 'Invisible Women',
      search: 'Invisible Women Caroline Criado Perez',
    },
    {
      title: 'Factfulness',
      search: 'Factfulness Hans Rosling',
    },
    {
      title: 'The Dawn of Everything',
      search: 'The Dawn of Everything David Graeber David Wengrow',
    },
  ],
  'romance': [
    {
      title: 'Pride and Prejudice',
      search: 'Pride and Prejudice Jane Austen',
    },
    {
      title: 'Outlander',
      search: 'Outlander Diana Gabaldon',
    },
    {
      title: 'Me Before You',
      search: 'Me Before You Jojo Moyes',
    },
    {
      title: 'The Time Traveler\'s Wife',
      search: 'The Time Traveler\'s Wife Audrey Niffenegger',
    },
    {
      title: 'Beach Read',
      search: 'Beach Read Emily Henry',
    },
    {
      title: 'Book Lovers',
      search: 'Book Lovers Emily Henry',
    },
    {
      title: 'People We Meet on Vacation',
      search: 'People We Meet on Vacation Emily Henry',
    },
    {
      title: 'Happy Place',
      search: 'Happy Place Emily Henry',
    },
    {
      title: 'The Love Hypothesis',
      search: 'The Love Hypothesis Ali Hazelwood',
    },
    {
      title: 'Funny Story',
      search: 'Funny Story Emily Henry',
    },
    {
      title: 'It Ends With Us',
      search: 'It Ends With Us Colleen Hoover',
    },
    {
      title: 'Love and Other Words',
      search: 'Love and Other Words Christina Lauren',
    },
    {
      title: 'The Rosie Project',
      search: 'The Rosie Project Graeme Simsion',
    },
    {
      title: 'The Hating Game',
      search: 'The Hating Game Sally Thorne',
    },
    {
      title: 'Red, White & Royal Blue',
      search: 'Red White and Royal Blue Casey McQuiston',
    },
    {
      title: 'The Kiss Quotient',
      search: 'The Kiss Quotient Helen Hoang',
    },
    {
      title: 'The Seven Year Slip',
      search: 'The Seven Year Slip Ashley Poston',
    },
    {
      title: 'The Unhoneymooners',
      search: 'The Unhoneymooners Christina Lauren',
    },
    {
      title: 'The Notebook',
      search: 'The Notebook Nicholas Sparks',
    },
    {
      title: 'The Wedding Date',
      search: 'The Wedding Date Jasmine Guillory',
    },
    {
      title: 'The Flatshare',
      search: 'The Flatshare Beth O\'Leary',
    },
    {
      title: 'Eleanor & Park',
      search: 'Eleanor and Park Rainbow Rowell',
    },
    {
      title: 'One Day',
      search: 'One Day David Nicholls',
    },
    {
      title: 'Nora Goes Off Script',
      search: 'Nora Goes Off Script Annabel Monaghan',
    },
    {
      title: 'The Simple Wild',
      search: 'The Simple Wild K A Tucker',
    },
    {
      title: 'Archer\'s Voice',
      search: 'Archer\'s Voice Mia Sheridan',
    },
    {
      title: 'Yours Truly',
      search: 'Yours Truly Abby Jimenez',
    },
    {
      title: 'Love, Theoretically',
      search: 'Love Theoretically Ali Hazelwood',
    },
    {
      title: 'Just for the Summer',
      search: 'Just for the Summer Abby Jimenez',
    },
    {
      title: 'The Spanish Love Deception',
      search: 'The Spanish Love Deception Elena Armas',
    },
    {
      title: 'Things We Never Got Over',
      search: 'Things We Never Got Over Lucy Score',
    },
    {
      title: 'Part of Your World',
      search: 'Part of Your World Abby Jimenez',
    },
    {
      title: 'Every Summer After',
      search: 'Every Summer After Carley Fortune',
    },
    {
      title: 'Love on the Brain',
      search: 'Love on the Brain Ali Hazelwood',
    },
    {
      title: 'The Deal',
      search: 'The Deal Elle Kennedy',
    },
    {
      title: 'Icebreaker',
      search: 'Icebreaker Hannah Grace',
    },
    {
      title: 'Before We Were Strangers',
      search: 'Before We Were Strangers Renee Carlino',
    },
    {
      title: 'The Friend Zone',
      search: 'The Friend Zone Abby Jimenez',
    },
    {
      title: 'The Dead Romantics',
      search: 'The Dead Romantics Ashley Poston',
    },
    {
      title: 'The Bodyguard',
      search: 'The Bodyguard Katherine Center',
    },
  ],
  'self-help': [
    {
      title: 'Atomic Habits',
      search: 'Atomic Habits James Clear',
    },
    {
      title: 'The Power of Habit',
      search: 'The Power of Habit Charles Duhigg',
    },
    {
      title: 'Mindset',
      search: 'Mindset Carol Dweck',
    },
    {
      title: 'Deep Work',
      search: 'Deep Work Cal Newport',
    },
    {
      title: 'Essentialism',
      search: 'Essentialism Greg McKeown',
    },
    {
      title: 'The Four Agreements',
      search: 'The Four Agreements Don Miguel Ruiz',
    },
    {
      title: 'The Subtle Art of Not Giving a F*ck',
      search: 'The Subtle Art of Not Giving a Fuck Mark Manson',
    },
    {
      title: 'Man\'s Search for Meaning',
      search: 'Man\'s Search for Meaning Viktor Frankl',
    },
    {
      title: 'The Mountain Is You',
      search: 'The Mountain Is You Brianna Wiest',
    },
    {
      title: 'The Happiness Project',
      search: 'The Happiness Project Gretchen Rubin',
    },
    {
      title: 'The Gifts of Imperfection',
      search: 'The Gifts of Imperfection Brene Brown',
    },
    {
      title: 'Grit',
      search: 'Grit Angela Duckworth',
    },
    {
      title: 'Thinking, Fast and Slow',
      search: 'Thinking Fast and Slow Daniel Kahneman',
    },
    {
      title: 'Tiny Habits',
      search: 'Tiny Habits BJ Fogg',
    },
    {
      title: 'Feel the Fear and Do It Anyway',
      search: 'Feel the Fear and Do It Anyway Susan Jeffers',
    },
    {
      title: 'The Miracle Morning',
      search: 'The Miracle Morning Hal Elrod',
    },
    {
      title: 'Ikigai',
      search: 'Ikigai Hector Garcia Francesc Miralles',
    },
    {
      title: 'The 7 Habits of Highly Effective People',
      search: 'The 7 Habits of Highly Effective People Stephen Covey',
    },
    {
      title: 'How to Win Friends and Influence People',
      search: 'How to Win Friends and Influence People Dale Carnegie',
    },
    {
      title: 'The Comfort Crisis',
      search: 'The Comfort Crisis Michael Easter',
    },
    {
      title: 'The Obstacle Is the Way',
      search: 'The Obstacle Is the Way Ryan Holiday',
    },
    {
      title: 'The Daily Stoic',
      search: 'The Daily Stoic Ryan Holiday Stephen Hanselman',
    },
    {
      title: 'Meditations',
      search: 'Meditations Marcus Aurelius',
    },
    {
      title: 'Can\'t Hurt Me',
      search: 'Can\'t Hurt Me David Goggins',
    },
    {
      title: 'Never Finished',
      search: 'Never Finished David Goggins',
    },
    {
      title: 'Quiet',
      search: 'Quiet Susan Cain',
    },
    {
      title: 'The Courage to Be Disliked',
      search: 'The Courage to Be Disliked Ichiro Kishimi Fumitake Koga',
    },
    {
      title: 'Digital Minimalism',
      search: 'Digital Minimalism Cal Newport',
    },
    {
      title: 'The Power of Now',
      search: 'The Power of Now Eckhart Tolle',
    },
    {
      title: 'Four Thousand Weeks',
      search: 'Four Thousand Weeks Oliver Burkeman',
    },
    {
      title: 'Why We Sleep',
      search: 'Why We Sleep Matthew Walker',
    },
    {
      title: 'Breath',
      search: 'Breath James Nestor',
    },
    {
      title: 'Peak',
      search: 'Peak Anders Ericsson Robert Pool',
    },
    {
      title: 'Flow',
      search: 'Flow Mihaly Csikszentmihalyi',
    },
    {
      title: 'Designing Your Life',
      search: 'Designing Your Life Bill Burnett Dave Evans',
    },
    {
      title: 'The One Thing',
      search: 'The One Thing Gary Keller Jay Papasan',
    },
    {
      title: 'Ego Is the Enemy',
      search: 'Ego Is the Enemy Ryan Holiday',
    },
    {
      title: 'The Compound Effect',
      search: 'The Compound Effect Darren Hardy',
    },
    {
      title: 'Make Your Bed',
      search: 'Make Your Bed William McRaven',
    },
    {
      title: 'The Untethered Soul',
      search: 'The Untethered Soul Michael Singer',
    },
  ],
  'sci-fi': [
    {
      title: 'Dune',
      search: 'Dune Frank Herbert',
    },
    {
      title: 'Project Hail Mary',
      search: 'Project Hail Mary Andy Weir',
    },
    {
      title: 'The Martian',
      search: 'The Martian Andy Weir',
    },
    {
      title: 'Ender\'s Game',
      search: 'Ender\'s Game Orson Scott Card',
    },
    {
      title: 'Foundation',
      search: 'Foundation Isaac Asimov',
    },
    {
      title: 'Hyperion',
      search: 'Hyperion Dan Simmons',
    },
    {
      title: 'Neuromancer',
      search: 'Neuromancer William Gibson',
    },
    {
      title: 'Snow Crash',
      search: 'Snow Crash Neal Stephenson',
    },
    {
      title: 'Red Rising',
      search: 'Red Rising Pierce Brown',
    },
    {
      title: 'Children of Time',
      search: 'Children of Time Adrian Tchaikovsky',
    },
    {
      title: 'The Three-Body Problem',
      search: 'The Three-Body Problem Cixin Liu',
    },
    {
      title: 'Leviathan Wakes',
      search: 'Leviathan Wakes James S A Corey',
    },
    {
      title: 'The Left Hand of Darkness',
      search: 'The Left Hand of Darkness Ursula K Le Guin',
    },
    {
      title: 'Do Androids Dream of Electric Sheep?',
      search: 'Do Androids Dream of Electric Sheep Philip K Dick',
    },
    {
      title: 'The Forever War',
      search: 'The Forever War Joe Haldeman',
    },
    {
      title: 'Rendezvous with Rama',
      search: 'Rendezvous with Rama Arthur C Clarke',
    },
    {
      title: 'The Player of Games',
      search: 'The Player of Games Iain M Banks',
    },
    {
      title: 'The Dispossessed',
      search: 'The Dispossessed Ursula K Le Guin',
    },
    {
      title: 'Old Man\'s War',
      search: 'Old Man\'s War John Scalzi',
    },
    {
      title: 'The Moon Is a Harsh Mistress',
      search: 'The Moon Is a Harsh Mistress Robert A Heinlein',
    },
    {
      title: 'Altered Carbon',
      search: 'Altered Carbon Richard K Morgan',
    },
    {
      title: 'Ancillary Justice',
      search: 'Ancillary Justice Ann Leckie',
    },
    {
      title: 'Seveneves',
      search: 'Seveneves Neal Stephenson',
    },
    {
      title: 'Wool',
      search: 'Wool Hugh Howey',
    },
    {
      title: 'Dark Matter',
      search: 'Dark Matter Blake Crouch',
    },
    {
      title: 'Recursion',
      search: 'Recursion Blake Crouch',
    },
    {
      title: 'A Fire Upon the Deep',
      search: 'A Fire Upon the Deep Vernor Vinge',
    },
    {
      title: 'Blindsight',
      search: 'Blindsight Peter Watts',
    },
    {
      title: 'House of Suns',
      search: 'House of Suns Alastair Reynolds',
    },
    {
      title: 'The Long Way to a Small, Angry Planet',
      search: 'The Long Way to a Small Angry Planet Becky Chambers',
    },
    {
      title: 'Gateway',
      search: 'Gateway Frederik Pohl',
    },
    {
      title: 'Ringworld',
      search: 'Ringworld Larry Niven',
    },
    {
      title: 'The Sparrow',
      search: 'The Sparrow Mary Doria Russell',
    },
    {
      title: 'Ready Player One',
      search: 'Ready Player One Ernest Cline',
    },
    {
      title: 'Jurassic Park',
      search: 'Jurassic Park Michael Crichton',
    },
    {
      title: 'Contact',
      search: 'Contact Carl Sagan',
    },
    {
      title: 'Childhood\'s End',
      search: 'Childhood\'s End Arthur C Clarke',
    },
    {
      title: 'The Stars My Destination',
      search: 'The Stars My Destination Alfred Bester',
    },
    {
      title: 'The Hitchhiker\'s Guide to the Galaxy',
      search: 'The Hitchhiker\'s Guide to the Galaxy Douglas Adams',
    },
    {
      title: 'I, Robot',
      search: 'I Robot Isaac Asimov',
    },
  ],
};