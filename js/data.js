/* Book catalogue + discount codes (shared by every page) */

// Covers load from the Open Library covers API by ISBN.
// If a cover fails to load, a coloured fallback cover is shown instead.
const BOOKS = [
  { id: 1,  title: "The Alchemist",           author: "Paulo Coelho",        category: "Fiction",    price: 399, isbn: "9780062315007", color: "#c0392b" },
  { id: 2,  title: "Atomic Habits",           author: "James Clear",         category: "Self Help",  price: 599, isbn: "9780735211292", color: "#e8e1d0" },
  { id: 3,  title: "Ikigai",                  author: "Héctor García",       category: "Self Help",  price: 450, isbn: "9780143130727", color: "#8fb3b0" },
  { id: 4,  title: "Clean Code",              author: "Robert C. Martin",    category: "Technology", price: 499, isbn: "9780132350884", color: "#1c2a48" },
  { id: 5,  title: "The Hobbit",              author: "J.R.R. Tolkien",      category: "Fantasy",    price: 350, isbn: "9780547928227", color: "#2e5e3a" },
  { id: 6,  title: "Harry Potter and the Philosopher's Stone", author: "J.K. Rowling", category: "Fantasy", price: 475, isbn: "9780747532699", color: "#7b2d26" },
  { id: 7,  title: "Gone Girl",               author: "Gillian Flynn",       category: "Mystery",    price: 420, isbn: "9780307588371", color: "#222222" },
  { id: 8,  title: "The Silent Patient",      author: "Alex Michaelides",    category: "Mystery",    price: 380, isbn: "9781250301697", color: "#3a4f6b" },
  { id: 9,  title: "The Da Vinci Code",       author: "Dan Brown",           category: "Mystery",    price: 360, isbn: "9780307474278", color: "#6b4a2b" },
  { id: 10, title: "Rich Dad Poor Dad",       author: "Robert T. Kiyosaki",  category: "Finance",    price: 330, isbn: "9781612680194", color: "#5b2a7a" },
  { id: 11, title: "The Psychology of Money", author: "Morgan Housel",       category: "Finance",    price: 399, isbn: "9780857197689", color: "#d9c27a" },
  { id: 12, title: "Think and Grow Rich",     author: "Napoleon Hill",       category: "Finance",    price: 250, isbn: "9781585424337", color: "#a2782f" },
  { id: 13, title: "1984",                    author: "George Orwell",       category: "Fiction",    price: 299, isbn: "9780451524935", color: "#8a1c1c" },
  { id: 14, title: "To Kill a Mockingbird",   author: "Harper Lee",          category: "Fiction",    price: 340, isbn: "9780061120084", color: "#4a6b3a" },
  { id: 15, title: "Deep Work",               author: "Cal Newport",         category: "Self Help",  price: 480, isbn: "9781455586691", color: "#2b2b2b" },
  { id: 16, title: "The Pragmatic Programmer", author: "David Thomas & Andrew Hunt", category: "Technology", price: 650, isbn: "9780135957059", color: "#3d3d3d" },
];

// type "percent" -> value is %, type "flat" -> value is rupees
const DISCOUNT_CODES = {
  READ10:     { type: "percent", value: 10, label: "10% off" },
  WELCOME:    { type: "percent", value: 15, label: "15% off" },
  FLAT50:     { type: "flat",    value: 50, label: "₹50 off" },
  BOOKWORM20: { type: "percent", value: 20, label: "20% off", minSubtotal: 1000 },
};

const TAX_RATE = 0.05; // 5% GST
