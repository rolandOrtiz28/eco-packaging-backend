require('dotenv').config();
const mongoose = require('mongoose');
const Banner = require('./models/Banner');

// Banner data
const bannersData = [
  {
    title: "Summer Sale - Up to 30% Off",
    subtitle: "Limited time offer on selected products",
    image: "https://res.cloudinary.com/rolandortiz/image/upload/v1715678913/banner1.jpg",
    ctaText: "Shop Now",
    ctaLink: "/retail",
    bgColor: "bg-green-50",
    titleColor: "light",
    subtitleColor: "dark",
    ctaColor: "gradient-white-to-eco",
    isActive: true,
  },
  {
    title: "Eco-Friendly Tote Bags",
    subtitle: "Stylish and sustainable packaging solutions",
    image: "https://res.cloudinary.com/rolandortiz/image/upload/v1715679000/banner2.jpg",
    ctaText: "Explore Collection",
    ctaLink: "/custom",
    bgColor: "bg-[#dfddd7]",
    titleColor: "dark",
    subtitleColor: "light",
    ctaColor: "light",
    isActive: true,
  },
  {
    title: "Bulk Orders? No Problem.",
    subtitle: "Get wholesale pricing on all bulk purchases",
    image: "https://res.cloudinary.com/rolandortiz/image/upload/v1715679100/banner3.jpg",
    ctaText: "Get a Quote",
    ctaLink: "/quote",
    bgColor: "bg-white",
    titleColor: "gradient-black-to-eco",
    subtitleColor: "gradient-white-to-eco",
    ctaColor: "dark",
    isActive: true,
  }
];

// Seed function
const seedBanners = async () => {
  try {
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    await Banner.deleteMany({});
    console.log('🧹 Existing banners cleared');

    const inserted = await Banner.insertMany(bannersData);
    console.log(`✅ Inserted ${inserted.length} banners`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding banners:', err.message);
    process.exit(1);
  }
};

seedBanners();
