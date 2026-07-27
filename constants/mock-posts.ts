import { Post } from '@/types/post';
import { Top3Item } from '@/types/top3-item';
import { Top3List } from '@/types/top3-list';

function createItem(
  id: string,
  title: string,
  subtitle?: string,
  imageUrl?: string
): Top3Item {
  return {
    id,
    title,
    subtitle,
    imageUrl,
  };
}

function createCollection(
  id: string,
  category: string,
  title: string,
  items: [Top3Item, Top3Item, Top3Item],
  topic?: string
): Top3List {
  const publishedAt = new Date().toISOString();

  return {
    id,
    category,
    topic,
    title,
    items,
    createdAt: publishedAt,
    updatedAt: publishedAt,
    publishedAt,
  };
}

function createPost(
  id: string,
  authorId: string,
  collection: Top3List,
  publishedAt: string
): Post {
  return {
    id,
    authorId,
    collection,
    publishedAt,
    reactions: 0,
    comments: 0,
  };
}

export const MOCK_POSTS: Post[] = [
  createPost(
    "mock-post-alex-movies-1",
    "alex",
    createCollection(
      "mock-list-alex-movies-1",
      "movies",
      "Top 3 Sci-Fi Movies",
      [
        createItem(
          "alex-movies-1-1",
          "Arrival",
          "2016"
        ),
        createItem(
          "alex-movies-1-2",
          "Blade Runner 2049",
          "2017"
        ),
        createItem(
          "alex-movies-1-3",
          "Interstellar",
          "2014"
        )
      ],
      "Sci-Fi"
    ),
    "2026-07-26T18:00:00Z"
  ),

  createPost(
    "mock-post-alex-tv-2",
    "alex",
    createCollection(
      "mock-list-alex-tv-2",
      "tv",
      "Top 3 Drama TV Shows",
      [
        createItem(
          "alex-tv-2-1",
          "Succession",
          "HBO"
        ),
        createItem(
          "alex-tv-2-2",
          "The Bear",
          "FX"
        ),
        createItem(
          "alex-tv-2-3",
          "Severance",
          "Apple TV+"
        )
      ],
      "Drama"
    ),
    "2026-07-26T15:00:00Z"
  ),

  createPost(
    "mock-post-alex-books-3",
    "alex",
    createCollection(
      "mock-list-alex-books-3",
      "books",
      "Top 3 Modern Novels",
      [
        createItem(
          "alex-books-3-1",
          "Tomorrow, and Tomorrow, and Tomorrow",
          "Gabrielle Zevin"
        ),
        createItem(
          "alex-books-3-2",
          "The Secret History",
          "Donna Tartt"
        ),
        createItem(
          "alex-books-3-3",
          "Pachinko",
          "Min Jin Lee"
        )
      ],
      "Modern Fiction"
    ),
    "2026-07-26T12:00:00Z"
  ),

  createPost(
    "mock-post-sarah-books-4",
    "sarah",
    createCollection(
      "mock-list-sarah-books-4",
      "books",
      "Top 3 Modern Novels",
      [
        createItem(
          "sarah-books-4-1",
          "The Secret History",
          "Donna Tartt"
        ),
        createItem(
          "sarah-books-4-2",
          "Pachinko",
          "Min Jin Lee"
        ),
        createItem(
          "sarah-books-4-3",
          "Tomorrow, and Tomorrow, and Tomorrow",
          "Gabrielle Zevin"
        )
      ],
      "Modern Fiction"
    ),
    "2026-07-26T09:00:00Z"
  ),

  createPost(
    "mock-post-sarah-movies-5",
    "sarah",
    createCollection(
      "mock-list-sarah-movies-5",
      "movies",
      "Top 3 Comfort Movies",
      [
        createItem(
          "sarah-movies-5-1",
          "Little Women",
          "2019"
        ),
        createItem(
          "sarah-movies-5-2",
          "Before Sunrise",
          "1995"
        ),
        createItem(
          "sarah-movies-5-3",
          "About Time",
          "2013"
        )
      ],
      "Comfort"
    ),
    "2026-07-26T06:00:00Z"
  ),

  createPost(
    "mock-post-sarah-tv-6",
    "sarah",
    createCollection(
      "mock-list-sarah-tv-6",
      "tv",
      "Top 3 Comedy TV Shows",
      [
        createItem(
          "sarah-tv-6-1",
          "Fleabag",
          "BBC"
        ),
        createItem(
          "sarah-tv-6-2",
          "Schitt's Creek",
          "CBC"
        ),
        createItem(
          "sarah-tv-6-3",
          "Ted Lasso",
          "Apple TV+"
        )
      ],
      "Comedy"
    ),
    "2026-07-26T03:00:00Z"
  ),

  createPost(
    "mock-post-chris-games-7",
    "chris",
    createCollection(
      "mock-list-chris-games-7",
      "games",
      "Top 3 Story Games",
      [
        createItem(
          "chris-games-7-1",
          "The Last of Us",
          "Naughty Dog"
        ),
        createItem(
          "chris-games-7-2",
          "Red Dead Redemption 2",
          "Rockstar Games"
        ),
        createItem(
          "chris-games-7-3",
          "God of War",
          "Santa Monica Studio"
        )
      ],
      "Story"
    ),
    "2026-07-26T00:00:00Z"
  ),

  createPost(
    "mock-post-chris-movies-8",
    "chris",
    createCollection(
      "mock-list-chris-movies-8",
      "movies",
      "Top 3 Sports Movies",
      [
        createItem(
          "chris-movies-8-1",
          "Moneyball",
          "2011"
        ),
        createItem(
          "chris-movies-8-2",
          "Rocky",
          "1976"
        ),
        createItem(
          "chris-movies-8-3",
          "Ford v Ferrari",
          "2019"
        )
      ],
      "Sports"
    ),
    "2026-07-25T21:00:00Z"
  ),

  createPost(
    "mock-post-chris-tv-9",
    "chris",
    createCollection(
      "mock-list-chris-tv-9",
      "tv",
      "Top 3 Documentaries",
      [
        createItem(
          "chris-tv-9-1",
          "The Last Dance",
          "ESPN"
        ),
        createItem(
          "chris-tv-9-2",
          "Drive to Survive",
          "Netflix"
        ),
        createItem(
          "chris-tv-9-3",
          "Welcome to Wrexham",
          "FX"
        )
      ],
      "Documentary"
    ),
    "2026-07-25T18:00:00Z"
  ),

  createPost(
    "mock-post-olivia-tv-10",
    "olivia",
    createCollection(
      "mock-list-olivia-tv-10",
      "tv",
      "Top 3 Drama TV Shows",
      [
        createItem(
          "olivia-tv-10-1",
          "Succession",
          "HBO"
        ),
        createItem(
          "olivia-tv-10-2",
          "The Bear",
          "FX"
        ),
        createItem(
          "olivia-tv-10-3",
          "Fleabag",
          "BBC"
        )
      ],
      "Drama"
    ),
    "2026-07-25T15:00:00Z"
  ),

  createPost(
    "mock-post-olivia-books-11",
    "olivia",
    createCollection(
      "mock-list-olivia-books-11",
      "books",
      "Top 3 Food Books",
      [
        createItem(
          "olivia-books-11-1",
          "Kitchen Confidential",
          "Anthony Bourdain"
        ),
        createItem(
          "olivia-books-11-2",
          "Salt Fat Acid Heat",
          "Samin Nosrat"
        ),
        createItem(
          "olivia-books-11-3",
          "Crying in H Mart",
          "Michelle Zauner"
        )
      ],
      "Food"
    ),
    "2026-07-25T12:00:00Z"
  ),

  createPost(
    "mock-post-olivia-movies-12",
    "olivia",
    createCollection(
      "mock-list-olivia-movies-12",
      "movies",
      "Top 3 Food Movies",
      [
        createItem(
          "olivia-movies-12-1",
          "Chef",
          "2014"
        ),
        createItem(
          "olivia-movies-12-2",
          "Ratatouille",
          "2007"
        ),
        createItem(
          "olivia-movies-12-3",
          "The Menu",
          "2022"
        )
      ],
      "Food"
    ),
    "2026-07-25T09:00:00Z"
  ),

  createPost(
    "mock-post-daniel-movies-13",
    "daniel",
    createCollection(
      "mock-list-daniel-movies-13",
      "movies",
      "Top 3 Sci-Fi Movies",
      [
        createItem(
          "daniel-movies-13-1",
          "Blade Runner 2049",
          "2017"
        ),
        createItem(
          "daniel-movies-13-2",
          "Interstellar",
          "2014"
        ),
        createItem(
          "daniel-movies-13-3",
          "Ex Machina",
          "2014"
        )
      ],
      "Sci-Fi"
    ),
    "2026-07-25T06:00:00Z"
  ),

  createPost(
    "mock-post-daniel-games-14",
    "daniel",
    createCollection(
      "mock-list-daniel-games-14",
      "games",
      "Top 3 Exploration Games",
      [
        createItem(
          "daniel-games-14-1",
          "Death Stranding",
          "Kojima Productions"
        ),
        createItem(
          "daniel-games-14-2",
          "Red Dead Redemption 2",
          "Rockstar Games"
        ),
        createItem(
          "daniel-games-14-3",
          "Outer Wilds",
          "Mobius Digital"
        )
      ],
      "Exploration"
    ),
    "2026-07-25T03:00:00Z"
  ),

  createPost(
    "mock-post-daniel-books-15",
    "daniel",
    createCollection(
      "mock-list-daniel-books-15",
      "books",
      "Top 3 Technology Books",
      [
        createItem(
          "daniel-books-15-1",
          "The Innovators",
          "Walter Isaacson"
        ),
        createItem(
          "daniel-books-15-2",
          "Creativity, Inc.",
          "Ed Catmull"
        ),
        createItem(
          "daniel-books-15-3",
          "Steve Jobs",
          "Walter Isaacson"
        )
      ],
      "Technology"
    ),
    "2026-07-25T00:00:00Z"
  ),

  createPost(
    "mock-post-emma-books-16",
    "emma",
    createCollection(
      "mock-list-emma-books-16",
      "books",
      "Top 3 Fantasy Books",
      [
        createItem(
          "emma-books-16-1",
          "The Name of the Wind",
          "Patrick Rothfuss"
        ),
        createItem(
          "emma-books-16-2",
          "The Hobbit",
          "J.R.R. Tolkien"
        ),
        createItem(
          "emma-books-16-3",
          "A Wizard of Earthsea",
          "Ursula K. Le Guin"
        )
      ],
      "Fantasy"
    ),
    "2026-07-24T21:00:00Z"
  ),

  createPost(
    "mock-post-emma-tv-17",
    "emma",
    createCollection(
      "mock-list-emma-tv-17",
      "tv",
      "Top 3 Period Dramas",
      [
        createItem(
          "emma-tv-17-1",
          "The Crown",
          "Netflix"
        ),
        createItem(
          "emma-tv-17-2",
          "Downton Abbey",
          "ITV"
        ),
        createItem(
          "emma-tv-17-3",
          "Bridgerton",
          "Netflix"
        )
      ],
      "Period Drama"
    ),
    "2026-07-24T18:00:00Z"
  ),

  createPost(
    "mock-post-emma-movies-18",
    "emma",
    createCollection(
      "mock-list-emma-movies-18",
      "movies",
      "Top 3 Book Adaptations",
      [
        createItem(
          "emma-movies-18-1",
          "Little Women",
          "2019"
        ),
        createItem(
          "emma-movies-18-2",
          "Dune",
          "2021"
        ),
        createItem(
          "emma-movies-18-3",
          "Pride & Prejudice",
          "2005"
        )
      ],
      "Adaptations"
    ),
    "2026-07-24T15:00:00Z"
  ),

  createPost(
    "mock-post-mason-movies-19",
    "mason",
    createCollection(
      "mock-list-mason-movies-19",
      "movies",
      "Top 3 Sports Movies",
      [
        createItem(
          "mason-movies-19-1",
          "Moneyball",
          "2011"
        ),
        createItem(
          "mason-movies-19-2",
          "Creed",
          "2015"
        ),
        createItem(
          "mason-movies-19-3",
          "Ford v Ferrari",
          "2019"
        )
      ],
      "Sports"
    ),
    "2026-07-24T12:00:00Z"
  ),

  createPost(
    "mock-post-mason-games-20",
    "mason",
    createCollection(
      "mock-list-mason-games-20",
      "games",
      "Top 3 Sports Games",
      [
        createItem(
          "mason-games-20-1",
          "EA Sports FC 25",
          "EA Sports"
        ),
        createItem(
          "mason-games-20-2",
          "NBA 2K25",
          "2K Sports"
        ),
        createItem(
          "mason-games-20-3",
          "Tony Hawk's Pro Skater 1 + 2",
          "Vicarious Visions"
        )
      ],
      "Sports"
    ),
    "2026-07-24T09:00:00Z"
  ),

  createPost(
    "mock-post-mason-books-21",
    "mason",
    createCollection(
      "mock-list-mason-books-21",
      "books",
      "Top 3 Athlete Memoirs",
      [
        createItem(
          "mason-books-21-1",
          "Shoe Dog",
          "Phil Knight"
        ),
        createItem(
          "mason-books-21-2",
          "Open",
          "Andre Agassi"
        ),
        createItem(
          "mason-books-21-3",
          "The Mamba Mentality",
          "Kobe Bryant"
        )
      ],
      "Memoir"
    ),
    "2026-07-24T06:00:00Z"
  ),

  createPost(
    "mock-post-grace-books-22",
    "grace",
    createCollection(
      "mock-list-grace-books-22",
      "books",
      "Top 3 Food Books",
      [
        createItem(
          "grace-books-22-1",
          "Crying in H Mart",
          "Michelle Zauner"
        ),
        createItem(
          "grace-books-22-2",
          "Kitchen Confidential",
          "Anthony Bourdain"
        ),
        createItem(
          "grace-books-22-3",
          "Salt Fat Acid Heat",
          "Samin Nosrat"
        )
      ],
      "Food"
    ),
    "2026-07-24T03:00:00Z"
  ),

  createPost(
    "mock-post-grace-movies-23",
    "grace",
    createCollection(
      "mock-list-grace-movies-23",
      "movies",
      "Top 3 Travel Movies",
      [
        createItem(
          "grace-movies-23-1",
          "The Secret Life of Walter Mitty",
          "2013"
        ),
        createItem(
          "grace-movies-23-2",
          "Before Sunrise",
          "1995"
        ),
        createItem(
          "grace-movies-23-3",
          "The Motorcycle Diaries",
          "2004"
        )
      ],
      "Travel"
    ),
    "2026-07-24T00:00:00Z"
  ),

  createPost(
    "mock-post-grace-tv-24",
    "grace",
    createCollection(
      "mock-list-grace-tv-24",
      "tv",
      "Top 3 Travel Shows",
      [
        createItem(
          "grace-tv-24-1",
          "Somebody Feed Phil",
          "Netflix"
        ),
        createItem(
          "grace-tv-24-2",
          "Parts Unknown",
          "CNN"
        ),
        createItem(
          "grace-tv-24-3",
          "The Reluctant Traveler",
          "Apple TV+"
        )
      ],
      "Travel"
    ),
    "2026-07-23T21:00:00Z"
  ),

  createPost(
    "mock-post-lucas-movies-25",
    "lucas",
    createCollection(
      "mock-list-lucas-movies-25",
      "movies",
      "Top 3 Sci-Fi Movies",
      [
        createItem(
          "lucas-movies-25-1",
          "Interstellar",
          "2014"
        ),
        createItem(
          "lucas-movies-25-2",
          "Arrival",
          "2016"
        ),
        createItem(
          "lucas-movies-25-3",
          "Blade Runner 2049",
          "2017"
        )
      ],
      "Sci-Fi"
    ),
    "2026-07-23T18:00:00Z"
  ),

  createPost(
    "mock-post-lucas-movies-26",
    "lucas",
    createCollection(
      "mock-list-lucas-movies-26",
      "movies",
      "Top 3 Adventure Movies",
      [
        createItem(
          "lucas-movies-26-1",
          "The Lord of the Rings: The Fellowship of the Ring",
          "2001"
        ),
        createItem(
          "lucas-movies-26-2",
          "Indiana Jones and the Last Crusade",
          "1989"
        ),
        createItem(
          "lucas-movies-26-3",
          "The Secret Life of Walter Mitty",
          "2013"
        )
      ],
      "Adventure"
    ),
    "2026-07-23T15:00:00Z"
  ),

  createPost(
    "mock-post-lucas-games-27",
    "lucas",
    createCollection(
      "mock-list-lucas-games-27",
      "games",
      "Top 3 Open World Games",
      [
        createItem(
          "lucas-games-27-1",
          "Red Dead Redemption 2",
          "Rockstar Games"
        ),
        createItem(
          "lucas-games-27-2",
          "The Legend of Zelda: Breath of the Wild",
          "Nintendo"
        ),
        createItem(
          "lucas-games-27-3",
          "Ghost of Tsushima",
          "Sucker Punch"
        )
      ],
      "Open World"
    ),
    "2026-07-23T12:00:00Z"
  ),

  createPost(
    "mock-post-mia-movies-28",
    "mia",
    createCollection(
      "mock-list-mia-movies-28",
      "movies",
      "Top 3 Music Movies",
      [
        createItem(
          "mia-movies-28-1",
          "Almost Famous",
          "2000"
        ),
        createItem(
          "mia-movies-28-2",
          "Whiplash",
          "2014"
        ),
        createItem(
          "mia-movies-28-3",
          "School of Rock",
          "2003"
        )
      ],
      "Music"
    ),
    "2026-07-23T09:00:00Z"
  ),

  createPost(
    "mock-post-mia-tv-29",
    "mia",
    createCollection(
      "mock-list-mia-tv-29",
      "tv",
      "Top 3 Comedy TV Shows",
      [
        createItem(
          "mia-tv-29-1",
          "Fleabag",
          "BBC"
        ),
        createItem(
          "mia-tv-29-2",
          "Ted Lasso",
          "Apple TV+"
        ),
        createItem(
          "mia-tv-29-3",
          "Abbott Elementary",
          "ABC"
        )
      ],
      "Comedy"
    ),
    "2026-07-23T06:00:00Z"
  ),

  createPost(
    "mock-post-mia-books-30",
    "mia",
    createCollection(
      "mock-list-mia-books-30",
      "books",
      "Top 3 Music Memoirs",
      [
        createItem(
          "mia-books-30-1",
          "Just Kids",
          "Patti Smith"
        ),
        createItem(
          "mia-books-30-2",
          "Born to Run",
          "Bruce Springsteen"
        ),
        createItem(
          "mia-books-30-3",
          "Crying in H Mart",
          "Michelle Zauner"
        )
      ],
      "Memoir"
    ),
    "2026-07-23T03:00:00Z"
  ),

  createPost(
    "mock-post-noah-books-31",
    "noah",
    createCollection(
      "mock-list-noah-books-31",
      "books",
      "Top 3 Design Books",
      [
        createItem(
          "noah-books-31-1",
          "The Design of Everyday Things",
          "Don Norman"
        ),
        createItem(
          "noah-books-31-2",
          "Creative Confidence",
          "Tom Kelley"
        ),
        createItem(
          "noah-books-31-3",
          "Grid Systems",
          "Josef Müller-Brockmann"
        )
      ],
      "Design"
    ),
    "2026-07-23T00:00:00Z"
  ),

  createPost(
    "mock-post-noah-movies-32",
    "noah",
    createCollection(
      "mock-list-noah-movies-32",
      "movies",
      "Top 3 Minimalist Movies",
      [
        createItem(
          "noah-movies-32-1",
          "Her",
          "2013"
        ),
        createItem(
          "noah-movies-32-2",
          "Columbus",
          "2017"
        ),
        createItem(
          "noah-movies-32-3",
          "Paterson",
          "2016"
        )
      ],
      "Minimalism"
    ),
    "2026-07-22T21:00:00Z"
  ),

  createPost(
    "mock-post-noah-tv-33",
    "noah",
    createCollection(
      "mock-list-noah-tv-33",
      "tv",
      "Top 3 Design Shows",
      [
        createItem(
          "noah-tv-33-1",
          "Abstract: The Art of Design",
          "Netflix"
        ),
        createItem(
          "noah-tv-33-2",
          "The World's Most Extraordinary Homes",
          "BBC"
        ),
        createItem(
          "noah-tv-33-3",
          "Grand Designs",
          "Channel 4"
        )
      ],
      "Design"
    ),
    "2026-07-22T18:00:00Z"
  ),

  createPost(
    "mock-post-zoe-tv-34",
    "zoe",
    createCollection(
      "mock-list-zoe-tv-34",
      "tv",
      "Top 3 Drama TV Shows",
      [
        createItem(
          "zoe-tv-34-1",
          "Succession",
          "HBO"
        ),
        createItem(
          "zoe-tv-34-2",
          "Severance",
          "Apple TV+"
        ),
        createItem(
          "zoe-tv-34-3",
          "The Bear",
          "FX"
        )
      ],
      "Drama"
    ),
    "2026-07-22T15:00:00Z"
  ),

  createPost(
    "mock-post-zoe-tv-35",
    "zoe",
    createCollection(
      "mock-list-zoe-tv-35",
      "tv",
      "Top 3 Mystery TV Shows",
      [
        createItem(
          "zoe-tv-35-1",
          "Dark",
          "Netflix"
        ),
        createItem(
          "zoe-tv-35-2",
          "Only Murders in the Building",
          "Hulu"
        ),
        createItem(
          "zoe-tv-35-3",
          "The Night Of",
          "HBO"
        )
      ],
      "Mystery"
    ),
    "2026-07-22T12:00:00Z"
  ),

  createPost(
    "mock-post-zoe-movies-36",
    "zoe",
    createCollection(
      "mock-list-zoe-movies-36",
      "movies",
      "Top 3 Mystery Movies",
      [
        createItem(
          "zoe-movies-36-1",
          "Gone Girl",
          "2014"
        ),
        createItem(
          "zoe-movies-36-2",
          "Prisoners",
          "2013"
        ),
        createItem(
          "zoe-movies-36-3",
          "Knives Out",
          "2019"
        )
      ],
      "Mystery"
    ),
    "2026-07-22T09:00:00Z"
  ),

  createPost(
    "mock-post-ethan-games-37",
    "ethan",
    createCollection(
      "mock-list-ethan-games-37",
      "games",
      "Top 3 Racing Games",
      [
        createItem(
          "ethan-games-37-1",
          "Forza Horizon 5",
          "Playground Games"
        ),
        createItem(
          "ethan-games-37-2",
          "Gran Turismo 7",
          "Polyphony Digital"
        ),
        createItem(
          "ethan-games-37-3",
          "F1 24",
          "Codemasters"
        )
      ],
      "Racing"
    ),
    "2026-07-22T06:00:00Z"
  ),

  createPost(
    "mock-post-ethan-games-38",
    "ethan",
    createCollection(
      "mock-list-ethan-games-38",
      "games",
      "Top 3 Story Games",
      [
        createItem(
          "ethan-games-38-1",
          "The Last of Us",
          "Naughty Dog"
        ),
        createItem(
          "ethan-games-38-2",
          "Red Dead Redemption 2",
          "Rockstar Games"
        ),
        createItem(
          "ethan-games-38-3",
          "Hades",
          "Supergiant Games"
        )
      ],
      "Story"
    ),
    "2026-07-22T03:00:00Z"
  ),

  createPost(
    "mock-post-ethan-movies-39",
    "ethan",
    createCollection(
      "mock-list-ethan-movies-39",
      "movies",
      "Top 3 Racing Movies",
      [
        createItem(
          "ethan-movies-39-1",
          "Ford v Ferrari",
          "2019"
        ),
        createItem(
          "ethan-movies-39-2",
          "Rush",
          "2013"
        ),
        createItem(
          "ethan-movies-39-3",
          "Days of Thunder",
          "1990"
        )
      ],
      "Racing"
    ),
    "2026-07-22T00:00:00Z"
  ),

  createPost(
    "mock-post-lily-books-40",
    "lily",
    createCollection(
      "mock-list-lily-books-40",
      "books",
      "Top 3 Modern Novels",
      [
        createItem(
          "lily-books-40-1",
          "Pachinko",
          "Min Jin Lee"
        ),
        createItem(
          "lily-books-40-2",
          "The Secret History",
          "Donna Tartt"
        ),
        createItem(
          "lily-books-40-3",
          "Tomorrow, and Tomorrow, and Tomorrow",
          "Gabrielle Zevin"
        )
      ],
      "Modern Fiction"
    ),
    "2026-07-21T21:00:00Z"
  ),

  createPost(
    "mock-post-lily-books-41",
    "lily",
    createCollection(
      "mock-list-lily-books-41",
      "books",
      "Top 3 Fantasy Books",
      [
        createItem(
          "lily-books-41-1",
          "The Hobbit",
          "J.R.R. Tolkien"
        ),
        createItem(
          "lily-books-41-2",
          "A Wizard of Earthsea",
          "Ursula K. Le Guin"
        ),
        createItem(
          "lily-books-41-3",
          "The Name of the Wind",
          "Patrick Rothfuss"
        )
      ],
      "Fantasy"
    ),
    "2026-07-21T18:00:00Z"
  ),

  createPost(
    "mock-post-lily-movies-42",
    "lily",
    createCollection(
      "mock-list-lily-movies-42",
      "movies",
      "Top 3 Comfort Movies",
      [
        createItem(
          "lily-movies-42-1",
          "About Time",
          "2013"
        ),
        createItem(
          "lily-movies-42-2",
          "Little Women",
          "2019"
        ),
        createItem(
          "lily-movies-42-3",
          "Before Sunrise",
          "1995"
        )
      ],
      "Comfort"
    ),
    "2026-07-21T15:00:00Z"
  ),

  createPost(
    "mock-post-ryan-movies-43",
    "ryan",
    createCollection(
      "mock-list-ryan-movies-43",
      "movies",
      "Top 3 Adventure Movies",
      [
        createItem(
          "ryan-movies-43-1",
          "The Secret Life of Walter Mitty",
          "2013"
        ),
        createItem(
          "ryan-movies-43-2",
          "Into the Wild",
          "2007"
        ),
        createItem(
          "ryan-movies-43-3",
          "The Motorcycle Diaries",
          "2004"
        )
      ],
      "Adventure"
    ),
    "2026-07-21T12:00:00Z"
  ),

  createPost(
    "mock-post-ryan-games-44",
    "ryan",
    createCollection(
      "mock-list-ryan-games-44",
      "games",
      "Top 3 Exploration Games",
      [
        createItem(
          "ryan-games-44-1",
          "Outer Wilds",
          "Mobius Digital"
        ),
        createItem(
          "ryan-games-44-2",
          "Red Dead Redemption 2",
          "Rockstar Games"
        ),
        createItem(
          "ryan-games-44-3",
          "Firewatch",
          "Campo Santo"
        )
      ],
      "Exploration"
    ),
    "2026-07-21T09:00:00Z"
  ),

  createPost(
    "mock-post-ryan-books-45",
    "ryan",
    createCollection(
      "mock-list-ryan-books-45",
      "books",
      "Top 3 Adventure Books",
      [
        createItem(
          "ryan-books-45-1",
          "Into Thin Air",
          "Jon Krakauer"
        ),
        createItem(
          "ryan-books-45-2",
          "Wild",
          "Cheryl Strayed"
        ),
        createItem(
          "ryan-books-45-3",
          "The Lost City of Z",
          "David Grann"
        )
      ],
      "Adventure"
    ),
    "2026-07-21T06:00:00Z"
  )
];