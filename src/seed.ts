import {
  PrismaClient,
  Roles,
  Gender,
  Status,
  AddressType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('🚫 Seed cannot run in production. Set NODE_ENV to development or staging.');
  }

  console.log('🌱 Starting database seeding...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.biometricAppointment.deleteMany();
  await prisma.biometricCenter.deleteMany();
  await prisma.applicationCounter.deleteMany();
  await prisma.country.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.file.deleteMany();
  await prisma.token.deleteMany();
  await prisma.tokenWhiteList.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  // Create application types
  console.log('📄 Creating application types...');
  const applicationTypes = await prisma.$transaction([
    prisma.applicationType.upsert({
      where: { code: 'TOURIST' },
      update: {},
      create: {
        code: 'TOURIST',
        name: 'Tourist',
        description: 'Tourism / holiday visits',
        isActive: true,
      },
    }),
    prisma.applicationType.upsert({
      where: { code: 'BUSINESS' },
      update: {},
      create: {
        code: 'BUSINESS',
        name: 'Business',
        description: 'Business visits and meetings',
        isActive: true,
      },
    }),
    prisma.applicationType.upsert({
      where: { code: 'STUDENT' },
      update: {},
      create: {
        code: 'STUDENT',
        name: 'Student',
        description: 'Study permits and student visas',
        isActive: true,
      },
    }),
    prisma.applicationType.upsert({
      where: { code: 'WORK' },
      update: {},
      create: {
        code: 'WORK',
        name: 'Work',
        description: 'Employment and work visas',
        isActive: true,
      },
    }),
    prisma.applicationType.upsert({
      where: { code: 'TRANSIT' },
      update: {},
      create: {
        code: 'TRANSIT',
        name: 'Transit',
        description: 'Transit through the country',
        isActive: true,
      },
    }),
  ]);
  console.log(`✅ Created ${applicationTypes.length} application types`);

  // Create countries - Gulf Arab Countries target list
  console.log('🌍 Creating Gulf Arab countries...');
  const countries = await Promise.all([
    // 1. Kingdom of Saudi Arabia
    prisma.country.create({
      data: {
        name: 'Kingdom of Saudi Arabia',
        isoCode2: 'SA',
        isoCode3: 'SAU',
        numericCode: '682',
        currency: 'SAR',
        currencyName: 'Saudi Riyal',
        dialCode: '+966',
        region: 'Asia',
        subregion: 'Western Asia',
        capital: 'Riyadh',
        flag: '🇸🇦',
        isActive: true,
        visaProcessingDays: 7,
        maxApplications: 5000,
        applicationFee: 150,
      },
    }),
    // 2. State of Kuwait
    prisma.country.create({
      data: {
        name: 'State of Kuwait',
        isoCode2: 'KW',
        isoCode3: 'KWT',
        numericCode: '414',
        currency: 'KWD',
        currencyName: 'Kuwaiti Dinar',
        dialCode: '+965',
        region: 'Asia',
        subregion: 'Western Asia',
        capital: 'Kuwait City',
        flag: '🇰🇼',
        isActive: true,
        visaProcessingDays: 5,
        maxApplications: 2000,
        applicationFee: 120,
      },
    }),
    // 3. United Arab Emirates
    prisma.country.create({
      data: {
        name: 'United Arab Emirates',
        isoCode2: 'AE',
        isoCode3: 'ARE',
        numericCode: '784',
        currency: 'AED',
        currencyName: 'UAE Dirham',
        dialCode: '+971',
        region: 'Asia',
        subregion: 'Western Asia',
        capital: 'Abu Dhabi',
        flag: '🇦🇪',
        isActive: true,
        visaProcessingDays: 5,
        maxApplications: 3000,
        applicationFee: 100,
      },
    }),
    // 4. State of Qatar
    prisma.country.create({
      data: {
        name: 'State of Qatar',
        isoCode2: 'QA',
        isoCode3: 'QAT',
        numericCode: '634',
        currency: 'QAR',
        currencyName: 'Qatari Riyal',
        dialCode: '+974',
        region: 'Asia',
        subregion: 'Western Asia',
        capital: 'Doha',
        flag: '🇶🇦',
        isActive: true,
        visaProcessingDays: 7,
        maxApplications: 1500,
        applicationFee: 130,
      },
    }),
    // 5. Republic of Iraq
    prisma.country.create({
      data: {
        name: 'Republic of Iraq',
        isoCode2: 'IQ',
        isoCode3: 'IRQ',
        numericCode: '368',
        currency: 'IQD',
        currencyName: 'Iraqi Dinar',
        dialCode: '+964',
        region: 'Asia',
        subregion: 'Western Asia',
        capital: 'Baghdad',
        flag: '🇮🇶',
        isActive: true,
        visaProcessingDays: 14,
        maxApplications: 1000,
        applicationFee: 80,
      },
    }),
    // 6. Arab Republic of Egypt
    prisma.country.create({
      data: {
        name: 'Arab Republic of Egypt',
        isoCode2: 'EG',
        isoCode3: 'EGY',
        numericCode: '818',
        currency: 'EGP',
        currencyName: 'Egyptian Pound',
        dialCode: '+20',
        region: 'Africa',
        subregion: 'Northern Africa',
        capital: 'Cairo',
        flag: '🇪🇬',
        isActive: true,
        visaProcessingDays: 10,
        maxApplications: 3500,
        applicationFee: 60,
      },
    }),
    // 7. Kingdom of Morocco
    prisma.country.create({
      data: {
        name: 'Kingdom of Morocco',
        isoCode2: 'MA',
        isoCode3: 'MAR',
        numericCode: '504',
        currency: 'MAD',
        currencyName: 'Moroccan Dirham',
        dialCode: '+212',
        region: 'Africa',
        subregion: 'Northern Africa',
        capital: 'Rabat',
        flag: '🇲🇦',
        isActive: true,
        visaProcessingDays: 12,
        maxApplications: 2500,
        applicationFee: 70,
      },
    }),
    // 8. Republic of Tunisia
    prisma.country.create({
      data: {
        name: 'Republic of Tunisia',
        isoCode2: 'TN',
        isoCode3: 'TUN',
        numericCode: '788',
        currency: 'TND',
        currencyName: 'Tunisian Dinar',
        dialCode: '+216',
        region: 'Africa',
        subregion: 'Northern Africa',
        capital: 'Tunis',
        flag: '🇹🇳',
        isActive: true,
        visaProcessingDays: 10,
        maxApplications: 1500,
        applicationFee: 65,
      },
    }),
    // 9. People's Democratic Republic of Algeria
    prisma.country.create({
      data: {
        name: "People's Democratic Republic of Algeria",
        isoCode2: 'DZ',
        isoCode3: 'DZA',
        numericCode: '012',
        currency: 'DZD',
        currencyName: 'Algerian Dinar',
        dialCode: '+213',
        region: 'Africa',
        subregion: 'Northern Africa',
        capital: 'Algiers',
        flag: '🇩🇿',
        isActive: true,
        visaProcessingDays: 14,
        maxApplications: 2000,
        applicationFee: 75,
      },
    }),
    // 10. State of Libya
    prisma.country.create({
      data: {
        name: 'State of Libya',
        isoCode2: 'LY',
        isoCode3: 'LBY',
        numericCode: '434',
        currency: 'LYD',
        currencyName: 'Libyan Dinar',
        dialCode: '+218',
        region: 'Africa',
        subregion: 'Northern Africa',
        capital: 'Tripoli',
        flag: '🇱🇾',
        isActive: true,
        visaProcessingDays: 21,
        maxApplications: 800,
        applicationFee: 90,
      },
    }),
    // 11. Islamic Republic of Mauritania
    prisma.country.create({
      data: {
        name: 'Islamic Republic of Mauritania',
        isoCode2: 'MR',
        isoCode3: 'MRT',
        numericCode: '478',
        currency: 'MRU',
        currencyName: 'Mauritanian Ouguiya',
        dialCode: '+222',
        region: 'Africa',
        subregion: 'Western Africa',
        capital: 'Nouakchott',
        flag: '🇲🇷',
        isActive: true,
        visaProcessingDays: 15,
        maxApplications: 600,
        applicationFee: 85,
      },
    }),
    // 12. Republic of Sudan
    prisma.country.create({
      data: {
        name: 'Republic of Sudan',
        isoCode2: 'SD',
        isoCode3: 'SDN',
        numericCode: '729',
        currency: 'SDG',
        currencyName: 'Sudanese Pound',
        dialCode: '+249',
        region: 'Africa',
        subregion: 'Northern Africa',
        capital: 'Khartoum',
        flag: '🇸🇩',
        isActive: true,
        visaProcessingDays: 18,
        maxApplications: 1200,
        applicationFee: 70,
      },
    }),
    // 13. Syrian Arab Republic
    prisma.country.create({
      data: {
        name: 'Syrian Arab Republic',
        isoCode2: 'SY',
        isoCode3: 'SYR',
        numericCode: '760',
        currency: 'SYP',
        currencyName: 'Syrian Pound',
        dialCode: '+963',
        region: 'Asia',
        subregion: 'Western Asia',
        capital: 'Damascus',
        flag: '🇸🇾',
        isActive: true,
        visaProcessingDays: 21,
        maxApplications: 800,
        applicationFee: 60,
      },
    }),
    // 14. State of Palestine
    prisma.country.create({
      data: {
        name: 'State of Palestine',
        isoCode2: 'PS',
        isoCode3: 'PSE',
        numericCode: '275',
        currency: 'ILS',
        currencyName: 'Israeli New Shekel',
        dialCode: '+970',
        region: 'Asia',
        subregion: 'Western Asia',
        capital: 'East Jerusalem',
        flag: '🇵🇸',
        isActive: true,
        visaProcessingDays: 14,
        maxApplications: 1000,
        applicationFee: 55,
      },
    }),
    // 15. Republic of Lebanon
    prisma.country.create({
      data: {
        name: 'Republic of Lebanon',
        isoCode2: 'LB',
        isoCode3: 'LBN',
        numericCode: '422',
        currency: 'LBP',
        currencyName: 'Lebanese Pound',
        dialCode: '+961',
        region: 'Asia',
        subregion: 'Western Asia',
        capital: 'Beirut',
        flag: '🇱🇧',
        isActive: true,
        visaProcessingDays: 12,
        maxApplications: 1200,
        applicationFee: 65,
      },
    }),
  ]);

  console.log(`✅ Created ${countries.length} countries`);

  // Create users
  console.log('👥 Creating users...');
  const seedPassword = process.env.SEED_PASSWORD || 'Asfaar@2025!';
  const hashedPassword = await bcrypt.hash(seedPassword, 10);

  const [
    superAdmin,
    admin,
    applicant,
    agency,
    finance,
    embassyOfficer,
    liaisonOfficer,
    verificationOfficer,
    biometricAgent,
    centerManager,
    receptionist,
    gatehouse,
    authority,
  ] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alhajee2009+superadmin@gmail.com' },
      update: { password: hashedPassword },
      create: {
        email: 'alhajee2009+superadmin@gmail.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        username: 'superadmin',
        roles: [Roles.SUPER_ADMIN],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'Africa/Lagos',
        locale: 'en',
      },
    }),
    prisma.user.upsert({
      where: { email: 'alhajee2009+admin@gmail.com' },
      update: { password: hashedPassword },
      create: {
        email: 'alhajee2009+admin@gmail.com',
        password: hashedPassword,
        firstName: 'Asfaar',
        lastName: 'Admin',
        username: 'asfaaradmin',
        roles: [Roles.ADMIN],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'Africa/Lagos',
        locale: 'en',
      },
    }),
    prisma.user.upsert({
      where: { email: 'alhajee2009+applicant@gmail.com' },
      update: { password: hashedPassword },
      create: {
        email: 'alhajee2009+applicant@gmail.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Applicant',
        username: 'testapplicant',
        gender: Gender.MALE,
        nin: '12345678901',
        state: 'Lagos',
        lga: 'Ikeja',
        roles: [Roles.APPLICANT],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'Africa/Lagos',
        locale: 'en',
      },
    }),
    prisma.user.upsert({
      where: { email: 'alhajee2009+agency@gmail.com' },
      update: { password: hashedPassword },
      create: {
        email: 'alhajee2009+agency@gmail.com',
        password: hashedPassword,
        firstName: 'Travel',
        lastName: 'Agency',
        username: 'travelagency',
        roles: [Roles.AGENCY],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'Africa/Lagos',
        locale: 'en',
      },
    }),
    prisma.user.upsert({
      where: { email: 'alhajee2009+finance@gmail.com' },
      update: { password: hashedPassword },
      create: {
        email: 'alhajee2009+finance@gmail.com',
        password: hashedPassword,
        firstName: 'Finance',
        lastName: 'Officer',
        username: 'financeofficer',
        roles: [Roles.FINANCE],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'Africa/Lagos',
        locale: 'en',
      },
    }),
    prisma.user.upsert({
      where: { email: 'alhajee2009+embassy@gmail.com' },
      update: { password: hashedPassword },
      create: {
        email: 'alhajee2009+embassy@gmail.com',
        password: hashedPassword,
        firstName: 'Embassy',
        lastName: 'Officer',
        username: 'embassyofficer',
        roles: [Roles.EMBASSY_OFFICER],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'Africa/Lagos',
        locale: 'en',
      },
    }),
    prisma.user.upsert({
      where: { email: 'alhajee2009+liaison@gmail.com' },
      update: { password: hashedPassword },
      create: {
        email: 'alhajee2009+liaison@gmail.com',
        password: hashedPassword,
        firstName: 'Liaison',
        lastName: 'Officer',
        username: 'liaisonofficer',
        roles: [Roles.LIAISON_OFFICER],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'Africa/Lagos',
        locale: 'en',
      },
    }),
    prisma.user.upsert({
      where: { email: 'alhajee2009+verification@gmail.com' },
      update: { password: hashedPassword },
      create: {
        email: 'alhajee2009+verification@gmail.com',
        password: hashedPassword,
        firstName: 'Verification',
        lastName: 'Officer',
        username: 'verificationofficer',
        roles: [Roles.VERIFICATION_OFFICER],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'Africa/Lagos',
        locale: 'en',
      },
    }),
    prisma.user.upsert({
      where: { email: 'alhajee2009+biometric@gmail.com' },
      update: { password: hashedPassword },
      create: {
        email: 'alhajee2009+biometric@gmail.com',
        password: hashedPassword,
        firstName: 'Biometric',
        lastName: 'Agent',
        username: 'biometricagent',
        roles: [Roles.BIOMETRIC_AGENT],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'Africa/Lagos',
        locale: 'en',
      },
    }),
    prisma.user.upsert({
      where: { email: 'alhajee2009+centermanager@gmail.com' },
      update: { password: hashedPassword },
      create: {
        email: 'alhajee2009+centermanager@gmail.com',
        password: hashedPassword,
        firstName: 'Center',
        lastName: 'Manager',
        username: 'centermanager',
        roles: [Roles.CENTER_MANAGER],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'Africa/Lagos',
        locale: 'en',
      },
    }),
    prisma.user.upsert({
      where: { email: 'alhajee2009+receptionist@gmail.com' },
      update: { password: hashedPassword },
      create: {
        email: 'alhajee2009+receptionist@gmail.com',
        password: hashedPassword,
        firstName: 'Front',
        lastName: 'Desk',
        username: 'receptionist',
        roles: [Roles.RECEPTIONIST],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'Africa/Lagos',
        locale: 'en',
      },
    }),
    prisma.user.upsert({
      where: { email: 'alhajee2009+gatehouse@gmail.com' },
      update: { password: hashedPassword },
      create: {
        email: 'alhajee2009+gatehouse@gmail.com',
        password: hashedPassword,
        firstName: 'Gate',
        lastName: 'House',
        username: 'gatehouse',
        roles: [Roles.GATEHOUSE],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'Africa/Lagos',
        locale: 'en',
      },
    }),
    prisma.user.upsert({
      where: { email: 'alhajee2009+authority@gmail.com' },
      update: { password: hashedPassword },
      create: {
        email: 'alhajee2009+authority@gmail.com',
        password: hashedPassword,
        firstName: 'Authority',
        lastName: 'User',
        username: 'authorityuser',
        roles: [Roles.AUTHORITY],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'Africa/Lagos',
        locale: 'en',
      },
    }),
  ]);

  // Keep users array alias so post/comment/like seeding below still works
  const users = [applicant, agency, finance];

  console.log('👤 Creating user profiles...');
  await Promise.all([
    prisma.userProfile.create({
      data: {
        userId: superAdmin.id,
        jobTitle: 'System Administrator',
        address: {
          street: '1 Government House',
          city: 'Abuja',
          state: 'FCT',
          country: 'Nigeria',
        },
      },
    }),
    prisma.userProfile.create({
      data: {
        userId: applicant.id,
        jobTitle: 'Visa Applicant',
        address: {
          street: '45 Allen Avenue',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
        },
      },
    }),
  ]);

  console.log('🏠 Creating addresses...');
  await Promise.all([
    prisma.address.create({
      data: {
        userId: superAdmin.id,
        addressLine1: '1 Government House',
        area: 'Central Business District',
        city: 'Abuja',
        state: 'FCT',
        country: 'Nigeria',
        type: AddressType.HOME,
        isDefault: true,
        isVerified: true,
      },
    }),
    prisma.address.create({
      data: {
        userId: admin.id,
        addressLine1: '123 Admin Street',
        area: 'Victoria Island',
        city: 'Lagos',
        state: 'Lagos',
        lga: 'Eti-Osa',
        country: 'Nigeria',
        type: AddressType.HOME,
        isDefault: true,
        isVerified: true,
      },
    }),
    prisma.address.create({
      data: {
        userId: applicant.id,
        addressLine1: '45 Allen Avenue',
        area: 'Ikeja',
        city: 'Lagos',
        state: 'Lagos',
        lga: 'Ikeja',
        country: 'Nigeria',
        type: AddressType.HOME,
        isDefault: true,
        isVerified: true,
        postalCode: '100001',
      },
    }),
  ]);

  console.log('📂 Creating categories...');
  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Technology',
        slug: 'technology',
        description: 'Latest tech trends and tutorials',
        color: '#3B82F6',
        icon: '💻',
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Programming',
        slug: 'programming',
        description: 'Programming languages and frameworks',
        color: '#10B981',
        icon: '⚡',
        isActive: true,
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Design',
        slug: 'design',
        description: 'UI/UX design and creative topics',
        color: '#F59E0B',
        icon: '🎨',
        isActive: true,
        sortOrder: 3,
      },
    }),
  ]);

  console.log('🏷️ Creating tags...');
  // Create tags
  const tags = await Promise.all([
    prisma.tag.create({
      data: {
        name: 'JavaScript',
        slug: 'javascript',
        description: 'JavaScript programming language',
        color: '#F7DF1E',
        categoryId: categories[1].id,
        usageCount: 0,
      },
    }),
    prisma.tag.create({
      data: {
        name: 'TypeScript',
        slug: 'typescript',
        description: 'TypeScript programming language',
        color: '#3178C6',
        categoryId: categories[1].id,
        usageCount: 0,
      },
    }),
    prisma.tag.create({
      data: {
        name: 'NestJS',
        slug: 'nestjs',
        description: 'NestJS framework',
        color: '#E0234E',
        categoryId: categories[1].id,
        usageCount: 0,
      },
    }),
    prisma.tag.create({
      data: {
        name: 'React',
        slug: 'react',
        description: 'React JavaScript library',
        color: '#61DAFB',
        categoryId: categories[1].id,
        usageCount: 0,
      },
    }),
    prisma.tag.create({
      data: {
        name: 'UI/UX',
        slug: 'ui-ux',
        description: 'User Interface and User Experience',
        color: '#FF6B6B',
        categoryId: categories[2].id,
        usageCount: 0,
      },
    }),
  ]);

  console.log('📝 Creating posts...');
  // Create posts
  const posts = await Promise.all([
    prisma.post.create({
      data: {
        title: 'Getting Started with NestJS',
        slug: 'getting-started-with-nestjs-' + Date.now(),
        content:
          'NestJS is a progressive Node.js framework for building efficient and scalable server-side applications...',
        excerpt: 'Learn how to build scalable APIs with NestJS framework',
        authorId: users[0].id,
        categoryId: categories[1].id,
        status: Status.ACTIVE,
        isPublished: true,
        publishedAt: new Date(),
        viewCount: 150,
        likeCount: 25,
        commentCount: 5,
      },
    }),
    prisma.post.create({
      data: {
        title: 'Modern UI Design Principles',
        slug: 'modern-ui-design-principles-' + Date.now(),
        content:
          'Explore the fundamental principles of modern user interface design...',
        excerpt: 'Discover the key principles that make great user interfaces',
        authorId: users[1].id,
        categoryId: categories[2].id,
        status: Status.ACTIVE,
        isPublished: true,
        publishedAt: new Date(),
        viewCount: 89,
        likeCount: 12,
        commentCount: 3,
      },
    }),
    prisma.post.create({
      data: {
        title: 'Building RESTful APIs with TypeScript',
        slug: 'building-restful-apis-typescript-' + Date.now(),
        content:
          'Learn how to build robust RESTful APIs using TypeScript and modern frameworks...',
        excerpt: 'A comprehensive guide to API development with TypeScript',
        authorId: users[2].id,
        categoryId: categories[1].id,
        status: Status.ACTIVE,
        isPublished: true,
        publishedAt: new Date(),
        viewCount: 203,
        likeCount: 34,
        commentCount: 8,
      },
    }),
  ]);

  console.log('🏷️ Connecting posts with tags...');
  // Connect posts with tags
  await Promise.all([
    prisma.post.update({
      where: { id: posts[0].id },
      data: {
        tags: {
          connect: [
            { id: tags[0].id }, // JavaScript
            { id: tags[1].id }, // TypeScript
            { id: tags[2].id }, // NestJS
          ],
        },
      },
    }),
    prisma.post.update({
      where: { id: posts[1].id },
      data: {
        tags: {
          connect: [{ id: tags[4].id }], // UI/UX
        },
      },
    }),
    prisma.post.update({
      where: { id: posts[2].id },
      data: {
        tags: {
          connect: [
            { id: tags[0].id }, // JavaScript
            { id: tags[1].id }, // TypeScript
          ],
        },
      },
    }),
  ]);

  console.log('💬 Creating comments...');
  // Create comments
  await Promise.all([
    prisma.comment.create({
      data: {
        content: 'Great post! Thanks for sharing this comprehensive guide.',
        authorId: users[1].id,
        postId: posts[0].id,
        status: Status.ACTIVE,
        likeCount: 3,
      },
    }),
    prisma.comment.create({
      data: {
        content:
          'Very helpful tutorial. Looking forward to more NestJS content!',
        authorId: users[2].id,
        postId: posts[0].id,
        status: Status.ACTIVE,
        likeCount: 5,
      },
    }),
    prisma.comment.create({
      data: {
        content:
          'These design principles are spot on. Thanks for the insights!',
        authorId: users[0].id,
        postId: posts[1].id,
        status: Status.ACTIVE,
        likeCount: 2,
      },
    }),
  ]);

  console.log('❤️ Creating likes...');
  // Create likes
  await Promise.all([
    prisma.like.create({
      data: {
        userId: users[1].id,
        postId: posts[0].id,
      },
    }),
    prisma.like.create({
      data: {
        userId: users[2].id,
        postId: posts[0].id,
      },
    }),
    prisma.like.create({
      data: {
        userId: users[0].id,
        postId: posts[1].id,
      },
    }),
  ]);

  console.log('🔔 Creating notifications...');
  // Create notifications
  await Promise.all([
    prisma.notification.create({
      data: {
        userId: users[0].id,
        title: 'Welcome to the platform!',
        message: 'Thank you for joining us. Start by creating your first post.',
        type: 'info',
        isRead: false,
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[1].id,
        title: 'New comment on your post',
        message: 'Someone commented on "Modern UI Design Principles"',
        type: 'comment',
        isRead: false,
      },
    }),
  ]);

  console.log('⚙️ Creating user preferences...');
  // Create user preferences
  await Promise.all([
    prisma.userPreference.create({
      data: {
        userId: users[0].id,
        key: 'email_notifications',
        value: 'true',
        category: 'notifications',
      },
    }),
    prisma.userPreference.create({
      data: {
        userId: users[0].id,
        key: 'theme',
        value: 'dark',
        category: 'appearance',
      },
    }),
    prisma.userPreference.create({
      data: {
        userId: users[1].id,
        key: 'email_notifications',
        value: 'false',
        category: 'notifications',
      },
    }),
    prisma.userPreference.create({
      data: {
        userId: users[1].id,
        key: 'theme',
        value: 'light',
        category: 'appearance',
      },
    }),
  ]);

  // Create biometric centers
  console.log('🏢 Creating biometric centers...');
  const biometricCenters = await Promise.all([
    prisma.biometricCenter.create({
      data: {
        name: 'ASFAAR-ABUJA HQ',
        code: 'ASFAAR-ABJ-HQ',
        centerNumber: '001', // Auto-assigned for seeding - normally auto-generated
        address: '14 Yedseram Street, Maitama, Abuja, Nigeria',
        city: 'Abuja',
        state: 'Federal Capital Territory',
        country: 'Nigeria',
        postalCode: '900001',
        phone: '+2347007004001',
        email: 'info@asfaarvisaservices.com',
        website: 'https://asfaarvisaservices.com',
        isActive: true,
        capacity: 50,
        openingTime: '09:00',
        closingTime: '17:00',
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        appointmentDuration: 30,
        bufferTime: 15,
        servicesOffered: [
          'BIOMETRIC_CAPTURE',
          'DOCUMENT_VERIFICATION',
          'PHOTO_CAPTURE',
          'FINGERPRINT_SCANNING',
        ],
        specialFacilities: [
          'WHEELCHAIR_ACCESS',
          'PARKING_AVAILABLE',
          'PUBLIC_TRANSPORT',
          'AIR_CONDITIONING',
        ],
        createdBy: superAdmin.id,
      },
    }),
    prisma.biometricCenter.create({
      data: {
        name: 'ASFAAR-LAGOS IKEJA',
        code: 'ASFAAR-LOS-IKJ',
        centerNumber: '002', // Auto-assigned for seeding - normally auto-generated
        address: '45 Allen Avenue, Ikeja, Lagos State, Nigeria',
        city: 'Lagos',
        state: 'Lagos State',
        country: 'Nigeria',
        postalCode: '100001',
        phone: '+2349012345678',
        email: 'lagos@asfaarvisaservices.com',
        website: 'https://asfaarvisaservices.com',
        isActive: false,
        capacity: 75,
        openingTime: '08:00',
        closingTime: '18:00',
        workingDays: [
          'MONDAY',
          'TUESDAY',
          'WEDNESDAY',
          'THURSDAY',
          'FRIDAY',
          'SATURDAY',
        ],
        appointmentDuration: 25,
        bufferTime: 10,
        servicesOffered: [
          'BIOMETRIC_CAPTURE',
          'DOCUMENT_VERIFICATION',
          'PHOTO_CAPTURE',
          'FINGERPRINT_SCANNING',
          'IRIS_SCANNING',
        ],
        specialFacilities: [
          'WHEELCHAIR_ACCESS',
          'PARKING_AVAILABLE',
          'PUBLIC_TRANSPORT',
          'AIR_CONDITIONING',
          'VIP_LOUNGE',
        ],
        createdBy: superAdmin.id,
      },
    }),
    prisma.biometricCenter.create({
      data: {
        name: 'ASFAAR-LAGOS ISLAND',
        code: 'ASFAAR-LOS-ISL',
        centerNumber: '003', // Auto-assigned for seeding - normally auto-generated
        address: '12 Marina Street, Lagos Island, Lagos State, Nigeria',
        city: 'Lagos',
        state: 'Lagos State',
        country: 'Nigeria',
        postalCode: '100001',
        phone: '+2349087654321',
        email: 'island@asfaarvisaservices.com',
        website: 'https://asfaarvisaservices.com',
        isActive: false,
        capacity: 40,
        openingTime: '09:00',
        closingTime: '17:00',
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        appointmentDuration: 30,
        bufferTime: 15,
        servicesOffered: [
          'BIOMETRIC_CAPTURE',
          'DOCUMENT_VERIFICATION',
          'PHOTO_CAPTURE',
        ],
        specialFacilities: [
          'WHEELCHAIR_ACCESS',
          'PUBLIC_TRANSPORT',
          'AIR_CONDITIONING',
        ],
        createdBy: superAdmin.id,
      },
    }),
    prisma.biometricCenter.create({
      data: {
        name: 'ASFAAR-KANO CENTRAL',
        code: 'ASFAAR-KNO-CTR',
        centerNumber: '004', // Auto-assigned for seeding - normally auto-generated
        address: '23 Ibrahim Taiwo Road, Kano, Kano State, Nigeria',
        city: 'Kano',
        state: 'Kano State',
        country: 'Nigeria',
        postalCode: '700001',
        phone: '+2348123456789',
        email: 'kano@asfaarvisaservices.com',
        website: 'https://asfaarvisaservices.com',
        isActive: false,
        capacity: 35,
        openingTime: '09:00',
        closingTime: '16:00',
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        appointmentDuration: 35,
        bufferTime: 20,
        servicesOffered: [
          'BIOMETRIC_CAPTURE',
          'DOCUMENT_VERIFICATION',
          'PHOTO_CAPTURE',
        ],
        specialFacilities: [
          'WHEELCHAIR_ACCESS',
          'PARKING_AVAILABLE',
          'AIR_CONDITIONING',
        ],
        createdBy: superAdmin.id,
      },
    }),
    prisma.biometricCenter.create({
      data: {
        name: 'ASFAAR-PORT HARCOURT',
        code: 'ASFAAR-PHC-GRA',
        centerNumber: '005', // Auto-assigned for seeding - normally auto-generated
        address:
          '15 Aba Road, GRA Phase 2, Port Harcourt, Rivers State, Nigeria',
        city: 'Port Harcourt',
        state: 'Rivers State',
        country: 'Nigeria',
        postalCode: '500001',
        phone: '+2347065432109',
        email: 'portharcourt@asfaarvisaservices.com',
        website: 'https://asfaarvisaservices.com',
        isActive: false,
        capacity: 45,
        openingTime: '08:30',
        closingTime: '17:30',
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        appointmentDuration: 30,
        bufferTime: 15,
        servicesOffered: [
          'BIOMETRIC_CAPTURE',
          'DOCUMENT_VERIFICATION',
          'PHOTO_CAPTURE',
          'FINGERPRINT_SCANNING',
        ],
        specialFacilities: [
          'WHEELCHAIR_ACCESS',
          'PARKING_AVAILABLE',
          'PUBLIC_TRANSPORT',
          'AIR_CONDITIONING',
        ],
        createdBy: superAdmin.id,
      },
    }),
  ]);

  // Create Booths for each center
  console.log('🏢 Creating booths...');
  const booths = [];

  // Create booths for ASFAAR-ABUJA HQ (the active center)
  const abujaCenter = biometricCenters.find(
    (center) => center.code === 'ASFAAR-ABJ-HQ',
  );
  if (abujaCenter) {
    const abujaBooths = await Promise.all([
      // Regular booths
      prisma.booth.create({
        data: {
          centerId: abujaCenter.id,
          boothNumber: 'R1',
          appointmentClass: 'REGULAR',
          isActive: true,
          isOccupied: false,
          hasCamera: true,
          hasFingerprintScanner: true,
          hasSignaturePad: false,
          createdBy: superAdmin.id,
        },
      }),
      prisma.booth.create({
        data: {
          centerId: abujaCenter.id,
          boothNumber: 'R2',
          appointmentClass: 'REGULAR',
          isActive: true,
          isOccupied: false,
          hasCamera: true,
          hasFingerprintScanner: true,
          hasSignaturePad: false,
          createdBy: superAdmin.id,
        },
      }),
      prisma.booth.create({
        data: {
          centerId: abujaCenter.id,
          boothNumber: 'R3',
          appointmentClass: 'REGULAR',
          isActive: true,
          isOccupied: false,
          hasCamera: true,
          hasFingerprintScanner: true,
          hasSignaturePad: true,
          createdBy: superAdmin.id,
        },
      }),
      // Premium booth
      prisma.booth.create({
        data: {
          centerId: abujaCenter.id,
          boothNumber: 'P1',
          appointmentClass: 'PREMIUM',
          isActive: true,
          isOccupied: false,
          hasCamera: true,
          hasFingerprintScanner: true,
          hasSignaturePad: true,
          createdBy: superAdmin.id,
        },
      }),
      // VIP booth
      prisma.booth.create({
        data: {
          centerId: abujaCenter.id,
          boothNumber: 'VIP1',
          appointmentClass: 'VIP',
          isActive: true,
          isOccupied: false,
          hasCamera: true,
          hasFingerprintScanner: true,
          hasSignaturePad: true,
          createdBy: superAdmin.id,
        },
      }),
    ]);
    booths.push(...abujaBooths);
  }

  // Create a few sample booths for Lagos center as well
  const lagosCenter = biometricCenters.find(
    (center) => center.code === 'ASFAAR-LAG-VI',
  );
  if (lagosCenter) {
    const lagosBooths = await Promise.all([
      prisma.booth.create({
        data: {
          centerId: lagosCenter.id,
          boothNumber: 'R1',
          appointmentClass: 'REGULAR',
          isActive: false, // Inactive since center is inactive
          isOccupied: false,
          hasCamera: true,
          hasFingerprintScanner: true,
          hasSignaturePad: false,
          createdBy: superAdmin.id,
        },
      }),
      prisma.booth.create({
        data: {
          centerId: lagosCenter.id,
          boothNumber: 'P1',
          appointmentClass: 'PREMIUM',
          isActive: false, // Inactive since center is inactive
          isOccupied: false,
          hasCamera: true,
          hasFingerprintScanner: true,
          hasSignaturePad: true,
          createdBy: superAdmin.id,
        },
      }),
    ]);
    booths.push(...lagosBooths);
  }

  console.log('✅ Database seeding completed successfully!');
  console.log('📊 Created:');
  console.log(`  - 13 role accounts`);
  console.log(`  - ${categories.length} categories`);
  console.log(`  - ${tags.length} tags`);
  console.log(`  - ${posts.length} posts`);
  console.log(`  - 3 comments`);
  console.log(`  - 3 likes`);
  console.log(`  - 2 notifications`);
  console.log(`  - 2 user profiles`);
  console.log(`  - ${biometricCenters.length} biometric centers`);
  console.log(`  - ${booths.length} booths`);

  const displayPassword = process.env.SEED_PASSWORD ? '(from SEED_PASSWORD env var)' : 'Asfaar@2025!';
  console.log('\n🔑 Seeded accounts (password: ' + displayPassword + '):');
  console.log('  - SUPER_ADMIN:          alhajee2009+superadmin@gmail.com');
  console.log('  - ADMIN:                alhajee2009+admin@gmail.com');
  console.log('  - APPLICANT:            alhajee2009+applicant@gmail.com');
  console.log('  - AGENCY:               alhajee2009+agency@gmail.com');
  console.log('  - FINANCE:              alhajee2009+finance@gmail.com');
  console.log('  - EMBASSY_OFFICER:      alhajee2009+embassy@gmail.com');
  console.log('  - LIAISON_OFFICER:      alhajee2009+liaison@gmail.com');
  console.log('  - VERIFICATION_OFFICER: alhajee2009+verification@gmail.com');
  console.log('  - BIOMETRIC_AGENT:      alhajee2009+biometric@gmail.com');
  console.log('  - CENTER_MANAGER:       alhajee2009+centermanager@gmail.com');
  console.log('  - RECEPTIONIST:         alhajee2009+receptionist@gmail.com');
  console.log('  - GATEHOUSE:            alhajee2009+gatehouse@gmail.com');
  console.log('  - AUTHORITY:            alhajee2009+authority@gmail.com');
  console.log('\n⚠️  Change passwords after first login in production.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
