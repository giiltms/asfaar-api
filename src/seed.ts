import { PrismaClient, Roles, Gender, Status, AddressType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
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

  // Create users
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@example.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      username: 'superadmin',
      roles: [Roles.SUPER_ADMIN],
      status: Status.ACTIVE,
      isVerified: true,
      isActive: true,
      timezone: 'UTC',
      locale: 'en',
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      username: 'admin',
      roles: [Roles.ADMIN],
      status: Status.ACTIVE,
      isVerified: true,
      isActive: true,
      timezone: 'UTC',
      locale: 'en',
    },
  });

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john.doe@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        gender: Gender.MALE,
        bio: 'Software engineer passionate about technology',
        website: 'https://johndoe.dev',
        nin: '12345678901',
        state: 'New York',
        lga: 'Manhattan',
        roles: [Roles.APPLICANT],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'America/New_York',
        locale: 'en',
      },
    }),
    prisma.user.create({
      data: {
        email: 'jane.smith@example.com',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        gender: Gender.FEMALE,
        bio: 'UX designer and tech enthusiast',
        website: 'https://janesmith.design',
        nin: '12345678902',
        state: 'California',
        lga: 'San Francisco',
        roles: [Roles.APPLICANT],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'America/Los_Angeles',
        locale: 'en',
      },
    }),
    prisma.user.create({
      data: {
        email: 'alex.wilson@example.com',
        password: hashedPassword,
        firstName: 'Alex',
        lastName: 'Wilson',
        username: 'alexwilson',
        bio: 'Full-stack developer and open source contributor',
        nin: '12345678903',
        state: 'London',
        lga: 'London',
        roles: [Roles.APPLICANT],
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'Europe/London',
        locale: 'en',
      },
    }),
  ]);

  console.log('👤 Creating user profiles...');
  // Create user profiles
  await Promise.all([
    prisma.userProfile.create({
      data: {
        userId: users[0].id,
        company: 'Tech Corp',
        jobTitle: 'Senior Software Engineer',
        education: 'Computer Science',
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'NestJS'],
        interests: ['Technology', 'Music', 'Travel'],
        socialLinks: {
          linkedin: 'https://linkedin.com/in/johndoe',
          github: 'https://github.com/johndoe',
          twitter: 'https://twitter.com/johndoe',
        },
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          zipCode: '10001',
        },
      },
    }),
    prisma.userProfile.create({
      data: {
        userId: users[1].id,
        company: 'Design Studio',
        jobTitle: 'UX Designer',
        education: 'Graphic Design',
        skills: ['Figma', 'Adobe Creative Suite', 'User Research', 'Prototyping'],
        interests: ['Design', 'Art', 'Photography'],
        socialLinks: {
          linkedin: 'https://linkedin.com/in/janesmith',
          dribbble: 'https://dribbble.com/janesmith',
        },
        address: {
          street: '456 Oak Ave',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          zipCode: '94102',
        },
      },
    }),
  ]);

  console.log('🏠 Creating addresses...');
  // Create addresses for users
  await Promise.all([
    // Addresses for superAdmin
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
    // Addresses for admin
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
    // Addresses for John Doe
    prisma.address.create({
      data: {
        userId: users[0].id,
        addressLine1: '123 Main Street',
        addressLine2: 'Apartment 4B',
        area: 'Manhattan',
        city: 'New York',
        state: 'New York',
        postalCode: '10001',
        country: 'United States',
        type: AddressType.HOME,
        isDefault: true,
        isVerified: true,
        label: 'Home Address',
        latitude: 40.7128,
        longitude: -74.0060,
      },
    }),
    // Addresses for Jane Smith
    prisma.address.create({
      data: {
        userId: users[1].id,
        addressLine1: '456 Oak Avenue',
        area: 'Mission District',
        city: 'San Francisco',
        state: 'California',
        postalCode: '94102',
        country: 'United States',
        type: AddressType.HOME,
        isDefault: true,
        isVerified: true,
        label: 'Home',
        latitude: 37.7749,
        longitude: -122.4194,
      },
    }),
    // Addresses for Alex Wilson
    prisma.address.create({
      data: {
        userId: users[2].id,
        addressLine1: '12 Ahmadu Bello Way',
        area: 'Garki',
        city: 'Abuja',
        state: 'FCT',
        lga: 'Abuja Municipal',
        country: 'Nigeria',
        type: AddressType.HOME,
        isDefault: true,
        isVerified: false,
        postalCode: '900001',
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
        content: 'NestJS is a progressive Node.js framework for building efficient and scalable server-side applications...',
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
        content: 'Explore the fundamental principles of modern user interface design...',
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
        content: 'Learn how to build robust RESTful APIs using TypeScript and modern frameworks...',
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
        content: 'Very helpful tutorial. Looking forward to more NestJS content!',
        authorId: users[2].id,
        postId: posts[0].id,
        status: Status.ACTIVE,
        likeCount: 5,
      },
    }),
    prisma.comment.create({
      data: {
        content: 'These design principles are spot on. Thanks for the insights!',
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

  console.log('✅ Database seeding completed successfully!');
  console.log('📊 Created:');
  console.log(`  - ${3 + users.length} users (including admin accounts)`);
  console.log(`  - ${categories.length} categories`);
  console.log(`  - ${tags.length} tags`);
  console.log(`  - ${posts.length} posts`);
  console.log(`  - 3 comments`);
  console.log(`  - 3 likes`);
  console.log(`  - 2 notifications`);
  console.log(`  - 4 user preferences`);
  console.log(`  - 2 user profiles`);

  console.log('\n🔑 Test accounts:');
  console.log('  - Super Admin: superadmin@example.com / password123');
  console.log('  - Admin: admin@example.com / password123');

  console.log('  - Applicant: john.doe@example.com / password123');
  console.log('  - Applicant: jane.smith@example.com / password123');
  console.log('  - Applicant: alex.wilson@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
