import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { name: "Demo Organization" },
    update: {},
    create: { name: "Demo Organization" }
  });

  const owner = await prisma.user.upsert({
    where: { email: "finance@demo.co" },
    update: { role: "owner" },
    create: {
      email: "finance@demo.co",
      role: "owner",
      organizationId: organization.id
    }
  });

  const [adobe, google, notion] = await Promise.all([
    prisma.merchant.upsert({
      where: { canonicalName: "Adobe" },
      update: { category: "saas" },
      create: { canonicalName: "Adobe", category: "saas" }
    }),
    prisma.merchant.upsert({
      where: { canonicalName: "Google Workspace" },
      update: { category: "saas" },
      create: { canonicalName: "Google Workspace", category: "saas" }
    }),
    prisma.merchant.upsert({
      where: { canonicalName: "Notion" },
      update: { category: "saas" },
      create: { canonicalName: "Notion", category: "saas" }
    })
  ]);

  await prisma.savingsLedger.deleteMany({
    where: { organizationId: organization.id }
  });
  await prisma.wasteFinding.deleteMany({
    where: { organizationId: organization.id }
  });
  await prisma.subscriptionDetected.deleteMany({
    where: { organizationId: organization.id }
  });

  const [subAdobe, subGoogle, subNotion] = await Promise.all([
    prisma.subscriptionDetected.create({
      data: {
        organizationId: organization.id,
        detectionKey: "seed:ADOBE:GBP",
        merchantId: adobe.id,
        ownerUserId: owner.id,
        billingCycle: "monthly",
        avgAmount: 980,
        currency: "GBP",
        confidence: 0.96,
        status: "active"
      }
    }),
    prisma.subscriptionDetected.create({
      data: {
        organizationId: organization.id,
        detectionKey: "seed:GOOGLE WORKSPACE:GBP",
        merchantId: google.id,
        billingCycle: "monthly",
        avgAmount: 430,
        currency: "GBP",
        confidence: 0.94,
        status: "active"
      }
    }),
    prisma.subscriptionDetected.create({
      data: {
        organizationId: organization.id,
        detectionKey: "seed:NOTION:GBP",
        merchantId: notion.id,
        billingCycle: "monthly",
        avgAmount: 260,
        currency: "GBP",
        confidence: 0.91,
        status: "review"
      }
    })
  ]);

  const duplicateAdobe = await prisma.wasteFinding.create({
    data: {
      organizationId: organization.id,
      subscriptionId: subAdobe.id,
      type: "duplicate",
      title: "Two Adobe plans appear to overlap",
      estimatedMonthlySaving: 420,
      confidence: 0.88,
      status: "open",
      ownerUserId: owner.id
    }
  });

  const orphanedNotion = await prisma.wasteFinding.create({
    data: {
      organizationId: organization.id,
      subscriptionId: subNotion.id,
      type: "orphaned",
      title: "Notion seats still billed for offboarded users",
      estimatedMonthlySaving: 180,
      confidence: 0.86,
      status: "in_review",
      ownerUserId: owner.id
    }
  });

  await prisma.savingsLedger.createMany({
    data: [
      {
        organizationId: organization.id,
        wasteFindingId: duplicateAdobe.id,
        estimatedMonthly: 420,
        confirmedMonthly: 250,
        realizedAt: new Date()
      },
      {
        organizationId: organization.id,
        wasteFindingId: orphanedNotion.id,
        estimatedMonthly: 180,
        confirmedMonthly: null
      }
    ]
  });

  console.log("Seed complete:", {
    organizationId: organization.id,
    subscriptions: [subAdobe.id, subGoogle.id, subNotion.id].length,
    findings: 2
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
