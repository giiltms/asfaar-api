import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export enum VerificationMethod {
  YOUVERIFY = 'youverify',
  TEST_MODE = 'test_mode',
  MANUAL = 'manual',
  API = 'api',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity('nin_verifications')
@Index(['nin'], { unique: true })
@Index(['verificationStatus'])
@Index(['verificationMethod'])
@Index(['createdAt'])
@Index(['userId'])
export class NinVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 11, unique: true })
  nin: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  middleName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName?: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  fullName?: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: string;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender?: Gender;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  verifiedPhoneNumber?: string;

  @Column({ type: 'text', nullable: true })
  photo?: string;

  // Address fields
  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine1?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine2?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lga?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode?: string;

  @Column({ type: 'varchar', length: 100, default: 'Nigeria' })
  country: string = 'Nigeria';

  // Birth place fields
  @Column({ type: 'varchar', length: 100, nullable: true })
  birthState?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  birthLga?: string;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verificationStatus: VerificationStatus;

  @Column({
    type: 'enum',
    enum: VerificationMethod,
    default: VerificationMethod.YOUVERIFY,
  })
  verificationMethod: VerificationMethod;

  @Column({ type: 'varchar', length: 255, nullable: true })
  verificationId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  trackingId?: string;

  @Column({ type: 'timestamp', nullable: true })
  verificationDate?: Date;

  @Column({ type: 'json', nullable: true })
  rawData?: any;

  @Column({ type: 'json', nullable: true })
  metadata?: any;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'int', default: 1 })
  verificationAttempts: number = 1;

  @Column({ type: 'timestamp', nullable: true })
  lastVerificationAttempt?: Date;

  // User who initiated the verification (optional)
  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId?: string;

  // IP address for audit trail
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  // User agent for audit trail
  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeData() {
    // Normalize NIN - remove any spaces or special characters
    if (this.nin) {
      this.nin = this.nin.replace(/\D/g, '');
    }

    // Normalize names - trim and proper case
    if (this.firstName) {
      this.firstName = this.firstName.trim();
    }
    if (this.middleName) {
      this.middleName = this.middleName.trim();
    }
    if (this.lastName) {
      this.lastName = this.lastName.trim();
    }
    if (this.fullName) {
      this.fullName = this.fullName.trim();
    }

    // Set full name if not provided
    if (!this.fullName && (this.firstName || this.lastName)) {
      const nameParts = [this.firstName, this.middleName, this.lastName]
        .filter(Boolean)
        .map(name => name?.trim());
      this.fullName = nameParts.join(' ');
    }

    // Set verification date if verified and not set
    if (this.verificationStatus === VerificationStatus.VERIFIED && !this.verificationDate) {
      this.verificationDate = new Date();
    }

    // Update last verification attempt
    this.lastVerificationAttempt = new Date();
  }

  // Helper methods
  get isVerified(): boolean {
    return this.verificationStatus === VerificationStatus.VERIFIED;
  }

  get isExpired(): boolean {
    if (!this.verificationDate) return false;
    // Verification expires after 1 year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return this.verificationDate < oneYearAgo;
  }

  get age(): number | null {
    if (!this.dateOfBirth) return null;
    const birthDate = new Date(this.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  toJSON() {
    return {
      id: this.id,
      nin: this.nin,
      firstName: this.firstName,
      middleName: this.middleName,
      lastName: this.lastName,
      fullName: this.fullName,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      phoneNumber: this.phoneNumber,
      verifiedPhoneNumber: this.verifiedPhoneNumber,
      photo: this.photo,
      address: {
        line1: this.addressLine1,
        line2: this.addressLine2,
        city: this.city,
        state: this.state,
        lga: this.lga,
        postalCode: this.postalCode,
        country: this.country,
      },
      birthPlace: {
        state: this.birthState,
        lga: this.birthLga,
      },
      verificationStatus: this.verificationStatus,
      verificationMethod: this.verificationMethod,
      verificationId: this.verificationId,
      trackingId: this.trackingId,
      verificationDate: this.verificationDate,
      verificationAttempts: this.verificationAttempts,
      lastVerificationAttempt: this.lastVerificationAttempt,
      isVerified: this.isVerified,
      isExpired: this.isExpired,
      age: this.age,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}