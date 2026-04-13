<script lang="ts">
	import { getIcon } from "obsidian";

	export let iconName: string;

	function loadIcon(target: HTMLElement, name: string) {
		const renderIcon = (iconName: string) => {
			target.empty();
			const icon = getIcon(iconName);
			if (icon) {
				target.append(icon);
			} else {
				console.error(`Icon ${iconName} not found`);
			}
		};

		renderIcon(name);

		return {
			update(newName: string) {
				renderIcon(newName);
			},
		};
	}
</script>

<div class="icon GA-icon" use:loadIcon={iconName}></div>

<style>
	.GA-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1em;
		height: 1em;
	}
	:global(.GA-icon svg) {
		width: 100%;
		height: 100%;
	}
</style>
