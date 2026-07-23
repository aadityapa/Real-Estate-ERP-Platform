import {
  assertProductionResidencyConfigured,
  assertStorageRegionAllowed,
  assertStorageUrlRegionAllowed,
  buildResidencyS3ObjectUrl,
  DEFAULT_DATA_RESIDENCY_REGION,
  extractS3RegionFromUrl,
  getConfiguredResidencyRegion,
  getResidencyStatus,
} from "./data-residency";

describe("data-residency", () => {
  const base = {
    DATA_RESIDENCY_REGION: "ap-south-1",
    AWS_REGION: "ap-south-1",
    AWS_S3_BUCKET: "propos-documents",
  };

  it("defaults residency to ap-south-1", () => {
    expect(getConfiguredResidencyRegion({})).toBe(
      DEFAULT_DATA_RESIDENCY_REGION,
    );
  });

  it("rejects AWS_REGION outside residency", () => {
    expect(() =>
      assertStorageRegionAllowed({
        ...base,
        AWS_REGION: "us-east-1",
      }),
    ).toThrow(/violates DATA_RESIDENCY_REGION/);
  });

  it("allows matching AWS_REGION", () => {
    expect(() => assertStorageRegionAllowed(base)).not.toThrow();
  });

  it("extracts region from virtual-hosted S3 URLs", () => {
    expect(
      extractS3RegionFromUrl(
        "https://propos-documents.s3.ap-south-1.amazonaws.com/a.pdf",
      ),
    ).toBe("ap-south-1");
    expect(
      extractS3RegionFromUrl(
        "https://propos-documents.s3-eu-west-1.amazonaws.com/a.pdf",
      ),
    ).toBe("eu-west-1");
  });

  it("rejects storage URLs outside residency", () => {
    expect(() =>
      assertStorageUrlRegionAllowed(
        "https://propos-documents.s3.us-east-1.amazonaws.com/x.pdf",
        base,
      ),
    ).toThrow(/violates DATA_RESIDENCY_REGION/);
  });

  it("builds S3 URLs only in residency region", () => {
    expect(buildResidencyS3ObjectUrl("tenants/t1/doc.pdf", base)).toBe(
      "https://propos-documents.s3.ap-south-1.amazonaws.com/tenants/t1/doc.pdf",
    );
  });

  it("enforces production residency when S3 is configured", () => {
    expect(() =>
      assertProductionResidencyConfigured({
        NODE_ENV: "production",
        AWS_S3_BUCKET: "propos-documents",
        AWS_REGION: "us-east-1",
        DATA_RESIDENCY_REGION: "ap-south-1",
      }),
    ).toThrow(/violates/);

    expect(() =>
      assertProductionResidencyConfigured({
        NODE_ENV: "production",
        AWS_S3_BUCKET: "propos-documents",
        // missing AWS_REGION
        DATA_RESIDENCY_REGION: "ap-south-1",
      }),
    ).toThrow(/AWS_REGION must be set/);
  });

  it("reports residency status", () => {
    const status = getResidencyStatus(base);
    expect(status.residencyRegion).toBe("ap-south-1");
    expect(status.aligned).toBe(true);
  });
});
