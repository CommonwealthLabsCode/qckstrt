import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaModule } from "../src/prisma.module";
import { PrismaService } from "../src/prisma.service";

// Mock @qckstrt/common environment functions
jest.mock("@qckstrt/common", () => ({
  ...jest.requireActual("@qckstrt/common"),
  isDevelopment: jest.fn().mockReturnValue(false),
  isTest: jest.fn().mockReturnValue(true),
}));

// Mock PrismaClient methods
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(function (this: object) {
      Object.assign(this, {
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
        $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
      });
      return this;
    }),
  };
});

describe("PrismaModule", () => {
  let module: TestingModule;
  let prismaService: PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await module?.close();
  });

  it("should be defined", () => {
    expect(module).toBeDefined();
  });

  it("should provide PrismaService", () => {
    expect(prismaService).toBeDefined();
    expect(prismaService).toBeInstanceOf(PrismaService);
  });

  it("should export PrismaService globally", async () => {
    // Create a child module that imports PrismaModule
    const childModule = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    const childPrismaService = childModule.get<PrismaService>(PrismaService);
    expect(childPrismaService).toBeDefined();

    await childModule.close();
  });
});
