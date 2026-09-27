// Every word must pass the "eight ways to hint it" test and have a close cousin:
// a word the imposter could plausibly land on from the group's clues. The cousin
// also powers Undercover mode, where the imposter is secretly dealt it.

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Category = {
  id: string;
  name: string;
  emoji: string;
};

export type WordEntry = {
  word: string;
  cousin: string;
  difficulty: Difficulty;
  categoryId: string;
};

type Row = [word: string, cousin: string, difficulty: 'e' | 'm' | 'h'];

const DIFFICULTY: Record<Row[2], Difficulty> = { e: 'easy', m: 'medium', h: 'hard' };

const RAW: Record<string, { name: string; emoji: string; words: Row[] }> = {
  food: {
    name: 'Food',
    emoji: '🍕',
    words: [
      ['Pizza', 'Calzone', 'e'],
      ['Ice Cream', 'Frozen Yogurt', 'e'],
      ['Pancake', 'Waffle', 'e'],
      ['Burger', 'Hot Dog', 'e'],
      ['Banana', 'Plantain', 'e'],
      ['Popcorn', 'Chips', 'e'],
      ['Spaghetti', 'Noodles', 'e'],
      ['Cupcake', 'Muffin', 'e'],
      ['Taco', 'Burrito', 'm'],
      ['Sushi', 'Sashimi', 'm'],
      ['Curry', 'Stew', 'm'],
      ['Croissant', 'Bagel', 'm'],
      ['Honey', 'Maple Syrup', 'm'],
      ['Dumpling', 'Ravioli', 'm'],
      ['Guacamole', 'Salsa', 'h'],
      ['Fondue', 'Raclette', 'h'],
      ['Kimchi', 'Sauerkraut', 'h'],
      ['Espresso', 'Latte', 'h'],
    ],
  },
  animals: {
    name: 'Animals',
    emoji: '🐶',
    words: [
      ['Dog', 'Cat', 'e'],
      ['Lion', 'Tiger', 'e'],
      ['Elephant', 'Rhino', 'e'],
      ['Penguin', 'Puffin', 'e'],
      ['Monkey', 'Gorilla', 'e'],
      ['Shark', 'Dolphin', 'e'],
      ['Frog', 'Toad', 'e'],
      ['Rabbit', 'Hamster', 'e'],
      ['Owl', 'Eagle', 'm'],
      ['Kangaroo', 'Wallaby', 'm'],
      ['Octopus', 'Squid', 'm'],
      ['Bee', 'Wasp', 'm'],
      ['Crocodile', 'Alligator', 'm'],
      ['Giraffe', 'Zebra', 'm'],
      ['Chameleon', 'Gecko', 'h'],
      ['Platypus', 'Otter', 'h'],
      ['Hedgehog', 'Porcupine', 'h'],
      ['Flamingo', 'Pelican', 'h'],
    ],
  },
  places: {
    name: 'Places',
    emoji: '🗺️',
    words: [
      ['Beach', 'Lake', 'e'],
      ['School', 'Library', 'e'],
      ['Zoo', 'Farm', 'e'],
      ['Hospital', 'Clinic', 'e'],
      ['Park', 'Playground', 'e'],
      ['Airport', 'Train Station', 'e'],
      ['Supermarket', 'Mall', 'e'],
      ['Museum', 'Art Gallery', 'm'],
      ['Castle', 'Palace', 'm'],
      ['Stadium', 'Arena', 'm'],
      ['Desert', 'Savanna', 'm'],
      ['Cinema', 'Theater', 'm'],
      ['Campsite', 'Cabin', 'm'],
      ['Lighthouse', 'Harbor', 'h'],
      ['Volcano', 'Geyser', 'h'],
      ['Casino', 'Arcade', 'h'],
      ['Observatory', 'Planetarium', 'h'],
    ],
  },
  jobs: {
    name: 'Jobs',
    emoji: '👩‍🚒',
    words: [
      ['Teacher', 'Tutor', 'e'],
      ['Doctor', 'Nurse', 'e'],
      ['Firefighter', 'Police Officer', 'e'],
      ['Chef', 'Baker', 'e'],
      ['Pilot', 'Flight Attendant', 'e'],
      ['Farmer', 'Gardener', 'e'],
      ['Dentist', 'Orthodontist', 'm'],
      ['Astronaut', 'Scientist', 'm'],
      ['Plumber', 'Electrician', 'm'],
      ['Photographer', 'Painter', 'm'],
      ['Lifeguard', 'Swim Coach', 'm'],
      ['Magician', 'Clown', 'm'],
      ['Librarian', 'Archivist', 'h'],
      ['Architect', 'Engineer', 'h'],
      ['Detective', 'Spy', 'h'],
      ['Judge', 'Lawyer', 'h'],
    ],
  },
  sports: {
    name: 'Sports & Games',
    emoji: '⚽',
    words: [
      ['Soccer', 'Rugby', 'e'],
      ['Basketball', 'Netball', 'e'],
      ['Swimming', 'Diving', 'e'],
      ['Tennis', 'Badminton', 'e'],
      ['Chess', 'Checkers', 'e'],
      ['Baseball', 'Cricket', 'm'],
      ['Skiing', 'Snowboarding', 'm'],
      ['Bowling', 'Mini Golf', 'm'],
      ['Boxing', 'Wrestling', 'm'],
      ['Surfing', 'Skateboarding', 'm'],
      ['Hide and Seek', 'Tag', 'm'],
      ['Archery', 'Darts', 'h'],
      ['Fencing', 'Karate', 'h'],
      ['Marathon', 'Triathlon', 'h'],
      ['Poker', 'Blackjack', 'h'],
    ],
  },
  home: {
    name: 'Around the House',
    emoji: '🏠',
    words: [
      ['Bed', 'Sofa', 'e'],
      ['Toothbrush', 'Comb', 'e'],
      ['Fridge', 'Freezer', 'e'],
      ['Umbrella', 'Raincoat', 'e'],
      ['Television', 'Computer', 'e'],
      ['Pillow', 'Blanket', 'e'],
      ['Mirror', 'Window', 'm'],
      ['Candle', 'Lamp', 'm'],
      ['Microwave', 'Oven', 'm'],
      ['Vacuum', 'Broom', 'm'],
      ['Alarm Clock', 'Watch', 'm'],
      ['Doorbell', 'Knocker', 'h'],
      ['Toaster', 'Kettle', 'h'],
      ['Bookshelf', 'Wardrobe', 'h'],
      ['Chimney', 'Fireplace', 'h'],
    ],
  },
  nature: {
    name: 'Nature & Weather',
    emoji: '🌦️',
    words: [
      ['Rainbow', 'Sunset', 'e'],
      ['Snow', 'Hail', 'e'],
      ['Tree', 'Bush', 'e'],
      ['Moon', 'Sun', 'e'],
      ['Flower', 'Plant', 'e'],
      ['River', 'Waterfall', 'm'],
      ['Thunderstorm', 'Hurricane', 'm'],
      ['Mountain', 'Hill', 'm'],
      ['Cactus', 'Aloe Vera', 'm'],
      ['Fog', 'Cloud', 'm'],
      ['Earthquake', 'Tsunami', 'h'],
      ['Glacier', 'Iceberg', 'h'],
      ['Coral Reef', 'Seaweed', 'h'],
      ['Eclipse', 'Meteor Shower', 'h'],
    ],
  },
  transport: {
    name: 'Transport',
    emoji: '🚲',
    words: [
      ['Bicycle', 'Scooter', 'e'],
      ['Bus', 'Tram', 'e'],
      ['Airplane', 'Helicopter', 'e'],
      ['Boat', 'Ship', 'e'],
      ['Train', 'Subway', 'e'],
      ['Taxi', 'Limousine', 'm'],
      ['Rocket', 'Satellite', 'm'],
      ['Motorcycle', 'Moped', 'm'],
      ['Tractor', 'Bulldozer', 'm'],
      ['Hot Air Balloon', 'Blimp', 'h'],
      ['Submarine', 'Yacht', 'h'],
      ['Canoe', 'Kayak', 'h'],
      ['Cable Car', 'Ski Lift', 'h'],
    ],
  },
  school: {
    name: 'School',
    emoji: '🎒',
    words: [
      ['Pencil', 'Pen', 'e'],
      ['Backpack', 'Lunchbox', 'e'],
      ['Homework', 'Test', 'e'],
      ['Recess', 'Lunch Break', 'e'],
      ['Classroom', 'Hallway', 'e'],
      ['Calculator', 'Ruler', 'm'],
      ['Science Fair', 'Talent Show', 'm'],
      ['Graduation', 'Prom', 'm'],
      ['Whiteboard', 'Chalkboard', 'm'],
      ['Field Trip', 'Sports Day', 'h'],
      ['Report Card', 'Certificate', 'h'],
      ['Detention', 'Suspension', 'h'],
    ],
  },
  events: {
    name: 'Holidays & Events',
    emoji: '🎉',
    words: [
      ['Birthday', 'Anniversary', 'e'],
      ['Wedding', 'Engagement', 'e'],
      ['Halloween', 'Costume Party', 'e'],
      ['Picnic', 'Barbecue', 'e'],
      ['Fireworks', 'Sparklers', 'e'],
      ['Sleepover', 'Camping Trip', 'm'],
      ['New Year', 'Countdown', 'm'],
      ['Concert', 'Festival', 'm'],
      ['Road Trip', 'Vacation', 'm'],
      ['Baby Shower', 'Gender Reveal', 'h'],
      ['Parade', 'Carnival', 'h'],
      ['Surprise Party', 'Housewarming', 'h'],
    ],
  },
  fun: {
    name: 'Fun & Fantasy',
    emoji: '🦄',
    words: [
      ['Superhero', 'Villain', 'e'],
      ['Dinosaur', 'Dragon', 'e'],
      ['Pirate', 'Sailor', 'e'],
      ['Robot', 'Alien', 'e'],
      ['Princess', 'Queen', 'e'],
      ['Ghost', 'Zombie', 'm'],
      ['Wizard', 'Witch', 'm'],
      ['Unicorn', 'Pegasus', 'm'],
      ['Treasure', 'Gold', 'm'],
      ['Mermaid', 'Siren', 'h'],
      ['Vampire', 'Werewolf', 'h'],
      ['Time Machine', 'Teleporter', 'h'],
    ],
  },
  clothing: {
    name: 'Clothing',
    emoji: '👕',
    words: [
      ['Hat', 'Cap', 'e'],
      ['Shoes', 'Sandals', 'e'],
      ['Pajamas', 'Onesie', 'e'],
      ['Jacket', 'Hoodie', 'e'],
      ['Sunglasses', 'Goggles', 'm'],
      ['Scarf', 'Gloves', 'm'],
      ['Swimsuit', 'Wetsuit', 'm'],
      ['Boots', 'Sneakers', 'm'],
      ['Tuxedo', 'Suit', 'h'],
      ['Belt', 'Suspenders', 'h'],
      ['Crown', 'Tiara', 'h'],
    ],
  },
};

export const CATEGORIES: Category[] = Object.entries(RAW).map(([id, c]) => ({
  id,
  name: c.name,
  emoji: c.emoji,
}));

export const WORDS: WordEntry[] = Object.entries(RAW).flatMap(([categoryId, c]) =>
  c.words.map(([word, cousin, d]) => ({ word, cousin, difficulty: DIFFICULTY[d], categoryId })),
);

export function categoryName(id: string): string {
  return RAW[id]?.name ?? id;
}
