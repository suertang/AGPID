/**
 * Provides a set of classes and methods for handling Neuroevolution and
 * genetic algorithms.
 *
 * @param {options} An object of options for Neuroevolution.
 */
var PIDevolution = function (options) {
	var self = this; // reference to the top scope of this module

	// Declaration of module parameters (options) and default values
	self.options = {
        randomCtl: function () {
			ctl=[];
			
			ctl.push(self.options.format(Math.random() * 30 ,2));
			ctl.push(self.options.format(Math.random() * 10 ,2));
			ctl.push(self.options.format(Math.random() * 100,2));
			return ctl;
		},
		format: function(v,dig=0){
			if(dig<0){
				return v;
			}
			return Math.round(v*Math.pow(10,dig))/Math.pow(10,dig);
		},
        activation: function (a) {
			ap = (-a) / 1;
			return (1 / (1 + Math.exp(ap)))
		},
		population: 50, // Population by generation.
		elitism: 0.2, // Best networks kepts unchanged for the next
		// generation (rate).
		randomBehaviour: 0.2, // New random networks for the next generation
		// (rate).
		mutationRate: 0.1, // Mutation rate on the weights of synapses.
		mutationRange: 0.5, // Interval of the mutation changes on the
		// synapse weight.
		historic: 0, // Latest generations saved.
		lowHistoric: false, // Only save score (not the network).
		scoreSort: -1, // Sort order (-1 = desc, 1 = asc).
		nbChild: 1 // Number of children by breeding.

	}

	/**
	 * Override default options.
	 *
	 * @param {options} An object of Neuroevolution options.
	 * @return void
	 */
	self.set = function (options) {
		for (var i in options) {
			if (this.options[i] != undefined) { // Only override if the passed in value
				// is actually defined.
				self.options[i] = options[i];
			}
		}
	}

	// Overriding default options with the pass in options
	self.set(options);

    /*PID**************************************************************/
	/**
	 * PID
	 *
	 * 
	 *
	 * @constructor
	 */
	var PID = function () {
        this.ctl = [];        
        this.integralX = 0;
        this.prevErrorX = 0;
	}
    PID.prototype.perceptronGeneration = function(){
		this.ctl=self.options.randomCtl()
    }
	/**
	 * Compute the output of an input.
	 *
	 * @param {inputs} Set of inputs.
	 * @return Network output.
	 */
	PID.prototype.compute = function (x) {
        var errorX = x[1] - x[0] ;
        this.integralX += errorX;
        var derivativeX = errorX - this.prevErrorX;
        this.prevErrorX = errorX;  

        return (this.ctl[0] * errorX + this.ctl[1] * this.integralX + this.ctl[2] * derivativeX);
	}


	/*GENOME**********************************************************************/
	/**
	 * Genome class.
	 *
	 * Composed of a score and a Neural Network.
	 *
	 * @constructor
	 *
	 * @param {score}
	 * @param {PID}
	 */
	var Genome = function (score, PID) {
		this.score = score || 0;
		this.PID = PID || null;
	}


	/*GENERATION******************************************************************/
	/**
	 * Generation class.
	 *
	 * Composed of a set of Genomes.
	 *
	 * @constructor
	 */
	var Generation = function () {
		this.genomes = [];
	}

	/**
	 * Add a genome to the generation.
	 *
	 * @param {genome} Genome to add.
	 * @return void.
	 */
	Generation.prototype.addGenome = function (genome) {
		// Locate position to insert Genome into.
		// The gnomes should remain sorted.
		for (var i = 0; i < this.genomes.length; i++) {
			// Sort in descending order.
			if (self.options.scoreSort < 0) {
				if (genome.score > this.genomes[i].score) {
					break;
				}
				// Sort in ascending order.
			} else {
				if (genome.score < this.genomes[i].score) {
					break;
				}
			}

		}

		// Insert genome into correct position.
		this.genomes.splice(i, 0, genome);
	}

	/**
	 * Breed to genomes to produce offspring(s).
	 *
	 * @param {g1} Genome 1.
	 * @param {g2} Genome 2.
	 * @param {nbChilds} Number of offspring (children).
	 */
	Generation.prototype.breed = function (g1, g2, nbChilds) {
		var datas = [];
		for (var nb = 0; nb < nbChilds; nb++) {
			// Deep clone of genome 1.
			var data = JSON.parse(JSON.stringify(g1));
			for (var i in g2.PID.ctl) {
				// Genetic crossover
				// 0.5 is the crossover factor.
				// FIXME Really should be a predefined constant.
				if (Math.random() <= 0.5) {
					data.PID.ctl[i] = g2.PID.ctl[i];
				}
			}

			// Perform mutation on some weights.
			for (var i in data.PID.ctl) {
				if (Math.random() <= self.options.mutationRate) {
					data.PID.ctl[i] += Math.random() *
						self.options.mutationRange *
						2 -
						self.options.mutationRange;
				}
			}
			datas.push(data);
		}

		return datas;
	}

	/**
	 * Generate the next generation.
	 *
	 * @return Next generation data array.
	 */
	Generation.prototype.generateNextGeneration = function () {
		var nexts = [];

		for (var i = 0; i < Math.round(self.options.elitism *
				self.options.population); i++) {
			if (nexts.length < self.options.population) {
				// Push a deep copy of ith Genome's Nethwork.
				nexts.push(JSON.parse(JSON.stringify(this.genomes[i].PID)));
			}
		}

		for (var i = 0; i < Math.round(self.options.randomBehaviour *
				self.options.population); i++) {
			var n = JSON.parse(JSON.stringify(this.genomes[0].PID));
			
				n.ctl = self.options.randomCtl();//随机生成PID参数？how？
			
			if (nexts.length < self.options.population) {
				nexts.push(n);
			}
		}

		var max = 0;
		while (true) {
			for (var i = 0; i < max; i++) {
				// Create the children and push them to the nexts array.
				var childs = this.breed(this.genomes[i], this.genomes[max],
					(self.options.nbChild > 0 ? self.options.nbChild : 1));
				for (var c in childs) {
					nexts.push(childs[c].PID);
					if (nexts.length >= self.options.population) {
						// Return once number of children is equal to the
						// population by generatino value.
						return nexts;
					}
				}
			}
			max++;
			if (max >= this.genomes.length - 1) {
				max = 0;
			}
		}
	}


	/*GENERATIONS*****************************************************************/
	/**
	 * Generations class.
	 *
	 * Hold's previous Generations and current Generation.
	 *
	 * @constructor
	 */
	var Generations = function () {
		this.generations = [];
		var currentGeneration = new Generation();
	}

	/**
	 * Create the first generation.
	 *
	 * @param {input} Input layer.
	 * @param {input} Hidden layer(s).
	 * @param {output} Output layer.
	 * @return First Generation.
	 */
	Generations.prototype.firstGeneration = function () {
		// FIXME input, hiddens, output unused.

		var out = [];
		for (var i = 0; i < self.options.population; i++) {
			// Generate the Network and save it.
			var pp = new PID();
			pp.perceptronGeneration();//随机填充
			out.push(pp);
		}

		this.generations.push(new Generation());
		return out;
	}

	/**
	 * Create the next Generation.
	 *
	 * @return Next Generation.
	 */
	Generations.prototype.nextGeneration = function () {
		if (this.generations.length == 0) {
			// Need to create first generation.
			return false;
		}

		var gen = this.generations[this.generations.length - 1]
			.generateNextGeneration();
		this.generations.push(new Generation());
		return gen;
	}

	/**
	 * Add a genome to the Generations.
	 *
	 * @param {genome}
	 * @return False if no Generations to add to.
	 */
	Generations.prototype.addGenome = function (genome) {
		// Can't add to a Generation if there are no Generations.
		if (this.generations.length == 0) return false;

		// FIXME addGenome returns void.
		return this.generations[this.generations.length - 1].addGenome(genome);
	}


	/*SELF************************************************************************/
	self.generations = new Generations();

	/**
	 * Reset and create a new Generations object.
	 *
	 * @return void.
	 */
	self.restart = function () {
		self.generations = new Generations();
	}

	/**
	 * Create the next generation.
	 *
	 * @return Neural Network array for next Generation.
	 */
	self.nextGeneration = function () {
		var PIDs = [];

		if (self.generations.generations.length == 0) {
			// If no Generations, create first.
			PIDs = self.generations.firstGeneration();
		} else {
			// Otherwise, create next one.
			PIDs = self.generations.nextGeneration();
		}

		// Create Networks from the current Generation.
		var pps = [];
		for (var i in PIDs) {
			var pp = new PID();
			pp.ctl = PIDs[i].ctl;
			pps.push(pp);
		}

		if (self.options.lowHistoric) {
			// Remove old Networks.
			if (self.generations.generations.length >= 2) {
				var genomes =
					self.generations
					.generations[self.generations.generations.length - 2]
					.genomes;
				for (var i in genomes) {
					delete genomes[i].PID;
				}
			}
		}

		if (self.options.historic != -1) {
			// Remove older generations.
			if (self.generations.generations.length > self.options.historic + 1) {
				self.generations.generations.splice(0,
					self.generations.generations.length - (self.options.historic + 1));
			}
		}

		return pps;
	}

	/**
	 * Adds a new Genome with specified Neural Network and score.
	 *
	 * @param {network} Neural Network.
	 * @param {score} Score value.
	 * @return void.
	 */
	self.networkScore = function (PID, score) {
		self.generations.addGenome(new Genome(score, PID));
	}
}