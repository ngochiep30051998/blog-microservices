import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

@Entity('categories')
@Index(['parentId', 'sortOrder'])
@Index(['level', 'sortOrder'])
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 150 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Hierarchy support
  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentId: string;

  @ManyToOne('Category', 'children', {
    onDelete: 'CASCADE'
  })
  parent: any;

  @OneToMany('Category', 'parent')
  children: any[];

  @Column({ type: 'int', default: 0 })
  level: number; // 0 = root, 1 = child, 2 = grandchild

  // Display and styling
  @Column({ length: 7, nullable: true })
  color: string; // Hex color code

  @Column({ length: 50, nullable: true })
  icon: string; // FontAwesome class or similar

  @Column({ type: 'text', nullable: true })
  coverImageUrl: string;

  // SEO fields
  @Column({ length: 60, nullable: true })
  metaTitle: string;

  @Column({ length: 160, nullable: true })
  metaDescription: string;

  @Column({ type: 'simple-json', nullable: true })
  schema: {
    type?: string;
    name?: string;
    description?: string;
  };

  // Status and ordering
  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  // Statistics
  @Column({ type: 'int', default: 0 })
  postCount: number;

  @Column({ type: 'int', default: 0 })
  totalViews: number;

  // Posts relationship
  @OneToMany('Post', 'category')
  posts: any[];

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Hooks
  @BeforeInsert()
  @BeforeUpdate()
  generateSlug() {
    if (this.name && !this.slug) {
      this.slug = this.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/[\s]+/g, '-')
        .replace(/-+/g, '-');
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  calculateLevel() {
    // This will be updated by service when parent is set
    // Level calculation is handled in CategoryService
  }
}