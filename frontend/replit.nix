{ pkgs }: {
	deps = [
		pkgs.python39Packages.pip
  pkgs.nodejs-16_x
		pkgs.nodePackages.typescript-language-server
		pkgs.yarn
		pkgs.replitPackages.jest
	];
}