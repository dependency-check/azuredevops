declare module namespace {

    export interface DataSource {
        name: string;
        timestamp: Date;
    }

    export interface ScanInfo {
        engineVersion: string;
        dataSource: DataSource[];
    }

    export interface Credits {
        NVD: string;
        NPM: string;
        RETIREJS: string;
        OSSINDEX: string;
    }

    export interface ProjectInfo {
        name: string;
        reportDate: Date;
        credits: Credits;
    }

    export interface VendorEvidence {
        type: string;
        confidence: string;
        source: string;
        name: string;
        value: string;
    }

    export interface ProductEvidence {
        type: string;
        confidence: string;
        source: string;
        name: string;
        value: string;
    }

    export interface VersionEvidence {
        type: string;
        confidence: string;
        source: string;
        name: string;
        value: string;
    }

    export interface EvidenceCollected {
        vendorEvidence: VendorEvidence[];
        productEvidence: ProductEvidence[];
        versionEvidence: VersionEvidence[];
    }

    export interface Package {
        id: string;
        confidence: string;
        url: string;
    }

    export interface VulnerabilityId {
        id: string;
        confidence: string;
    }

    export interface PackageId {
        id: string;
        url: string;
    }

    export interface RelatedDependency {
        isVirtual: boolean;
        filePath: string;
        packageIds: PackageId[];
    }

    export interface Dependency {
        isVirtual: boolean;
        fileName: string;
        filePath: string;
        md5: string;
        sha1: string;
        sha256: string;
        evidenceCollected: EvidenceCollected;
        packages: Package[];
        vulnerabilityIds: VulnerabilityId[];
        relatedDependencies: RelatedDependency[];
    }

    export interface Scan {
        reportSchema: string;
        scanInfo: ScanInfo;
        projectInfo: ProjectInfo;
        dependencies: Dependency[];
    }

}

