-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "scientific_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "size_category" TEXT NOT NULL,
    "height_cm" INTEGER NOT NULL,
    "light_need" TEXT NOT NULL,
    "water_frequency" TEXT NOT NULL,
    "care_level" TEXT NOT NULL,
    "pet_safe" BOOLEAN NOT NULL,
    "color" TEXT NOT NULL,
    "in_stock" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
